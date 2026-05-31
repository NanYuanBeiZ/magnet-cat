const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const axios = require('axios');

class CloudSync {
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.settingsPath = path.join(userDataPath, 'cloud_settings.json');
    this.logs = [];
    this.settings = null;
  }

  log(level, message) {
    const time = new Date().toISOString();
    const log = `[${time}] [${level.toUpperCase()}] ${message}`;
    this.logs.push(log);
    console.log(log);
  }

  async loadSettings() {
    try {
      await fs.access(this.settingsPath);
      const data = await fs.readFile(this.settingsPath, 'utf8');
      this.settings = JSON.parse(data);
      return { success: true, settings: this.settings };
    } catch (err) {
      this.settings = { repo: '', lastSyncTime: '' };
      return { success: true, settings: this.settings };
    }
  }

  async saveSettings(settings) {
    this.settings = settings;
    await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
    await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return { success: true };
  }

  getMachineKey() {
    const hostname = os.hostname();
    const username = os.userInfo().username;
    const platform = os.platform();
    const arch = os.arch();
    const machineStr = `${hostname}-${username}-${platform}-${arch}-magnet-cat-v1`;
    return crypto.createHash('sha256').update(machineStr).digest();
  }

  async deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
  }

  encryptData(data, key) {
    const iv = crypto.randomBytes(12);
    const salt = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    return {
      s: salt.toString('base64'),
      i: iv.toString('base64'),
      a: authTag.toString('base64'),
      d: encrypted
    };
  }

  decryptData(envelope, key) {
    const iv = Buffer.from(envelope.i, 'base64');
    const authTag = Buffer.from(envelope.a, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(envelope.d, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  async encryptWithMachineKey(data) {
    const key = this.getMachineKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    return {
      i: iv.toString('base64'),
      a: authTag.toString('base64'),
      d: encrypted
    };
  }

  async decryptWithMachineKey(envelope) {
    const key = this.getMachineKey();
    const iv = Buffer.from(envelope.i, 'base64');
    const authTag = Buffer.from(envelope.a, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(envelope.d, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const key = await this.deriveKey(password, salt);
    const hash = crypto.createHash('sha256').update(key).digest('base64');
    return { salt: salt.toString('base64'), hash };
  }

  async verifyPassword(password, saltBase64, hashBase64) {
    const salt = Buffer.from(saltBase64, 'base64');
    const key = await this.deriveKey(password, salt);
    const hash = crypto.createHash('sha256').update(key).digest('base64');
    return hash === hashBase64;
  }

  getSyncFilePath(password) {
    const hash = crypto.createHash('sha256').update('magnet-cat-file-derive-' + password).digest('hex');
    const shortHash = hash.substring(0, 12);
    return `magnet_cat_sync_${shortHash}.enc`;
  }

  async testConnection(settings) {
    try {
      const { repo, token } = settings;
      const [owner, repoName] = repo.split('/');
      if (!owner || !repoName) return { success: false, message: '仓库格式错误，应为 owner/repo' };

      const response = await axios.get(`https://gitee.com/api/v5/repos/${owner}/${repoName}`, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'magnet-cat'
        },
        timeout: 15000
      });

      return { success: true, message: '连接成功' };
    } catch (err) {
      this.log('error', `连接测试失败: ${err.message}`);
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }

  async pushData(settings, password, data) {
    try {
      const { repo, token } = settings;
      const [owner, repoName] = repo.split('/');
      const filePath = this.getSyncFilePath(password);
      
      const salt = crypto.randomBytes(16);
      const key = await this.deriveKey(password, salt);
      const syncData = {
        version: 1,
        lastSyncTime: new Date().toISOString(),
        items: data
      };
      const envelope = this.encryptData(syncData, key);
      const content = JSON.stringify(envelope);
      const contentBase64 = Buffer.from(content, 'utf8').toString('base64');

      let existingSha = null;
      try {
        const getResp = await axios.get(`https://gitee.com/api/v5/repos/${owner}/${repoName}/contents/${filePath}`, {
          headers: { 'Authorization': `token ${token}`, 'User-Agent': 'magnet-cat' },
          timeout: 15000
        });
        existingSha = getResp.data.sha;
      } catch (err) {
        if (err.response?.status !== 404) throw err;
      }

      const payload = {
        message: 'sync magnet-cat data',
        content: contentBase64
      };
      if (existingSha) payload.sha = existingSha;

      await axios.put(`https://gitee.com/api/v5/repos/${owner}/${repoName}/contents/${filePath}`, payload, {
        headers: { 'Authorization': `token ${token}`, 'User-Agent': 'magnet-cat' },
        timeout: 15000
      });

      settings.lastSyncTime = syncData.lastSyncTime;
      await this.saveSettings(settings);
      this.log('info', '数据推送成功');
      return { success: true, lastSyncTime: syncData.lastSyncTime };
    } catch (err) {
      this.log('error', `数据推送失败: ${err.message}`);
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }

  async pullData(settings, password) {
    try {
      const { repo, token } = settings;
      const [owner, repoName] = repo.split('/');
      const filePath = this.getSyncFilePath(password);

      const response = await axios.get(`https://gitee.com/api/v5/repos/${owner}/${repoName}/contents/${filePath}`, {
        headers: { 'Authorization': `token ${token}`, 'User-Agent': 'magnet-cat' },
        timeout: 15000
      });

      const contentBase64 = response.data.content;
      const content = Buffer.from(contentBase64, 'base64').toString('utf8');
      const envelope = JSON.parse(content);

      const salt = Buffer.from(envelope.s, 'base64');
      const key = await this.deriveKey(password, salt);
      const syncData = this.decryptData(envelope, key);

      settings.lastSyncTime = syncData.lastSyncTime;
      await this.saveSettings(settings);
      this.log('info', '数据拉取成功');
      return { success: true, items: syncData.items, lastSyncTime: syncData.lastSyncTime };
    } catch (err) {
      this.log('error', `数据拉取失败: ${err.message}`);
      if (err.response?.status === 404) {
        return { success: true, items: [], noData: true };
      }
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }

  async clearAllData() {
    try {
      await fs.unlink(this.settingsPath);
      this.settings = null;
      return { success: true };
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.log('error', `清除数据失败: ${err.message}`);
        return { success: false, message: err.message };
      }
      return { success: true };
    }
  }
}

module.exports = CloudSync;

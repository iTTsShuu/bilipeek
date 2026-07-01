'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const FILE = path.join(app.getPath('userData'), 'settings.json');

const DEFAULTS = {
  bounds: { width: 480, height: 300, x: undefined, y: undefined },
  alwaysOnTop: true,
  bossKey: 'CommandOrControl+Alt+H'
};

function read() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    return Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch (e) {
    return Object.assign({}, DEFAULTS);
  }
}

function write(data) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // 忽略写入失败（如目录不可写），不影响运行
  }
}

module.exports = { read, write, DEFAULTS };

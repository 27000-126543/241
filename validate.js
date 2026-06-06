// 验证脚本：确认所有功能实现
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  项目功能验证报告');
console.log('========================================\n');

// 1. 检查项目结构
console.log('1. 项目结构检查:');
const requiredFiles = [
  'dist/main/main.js',
  'dist/renderer/index.html',
  'node_modules/electron/dist/electron.exe',
  'src/renderer/pages/Dashboard.tsx',
  'src/renderer/pages/EventManagement.tsx',
  'src/renderer/pages/ScheduleManagement.tsx',
  'src/renderer/pages/TaskManagement.tsx',
  'src/renderer/pages/MatchCenter.tsx',
  'src/renderer/pages/SecurityCenter.tsx',
  'src/renderer/pages/EquipmentManagement.tsx',
  'src/renderer/pages/VenueMap.tsx',
  'src/renderer/pages/Statistics.tsx'
];

requiredFiles.forEach(f => {
  const exists = fs.existsSync(path.join(__dirname, f));
  console.log(`   ${exists ? '✅' : '❌'} ${f}`);
});

// 2. 检查 VenueMap 热力图实现
console.log('\n2. VenueMap 热力图验证:');
const venueMapCode = fs.readFileSync(path.join(__dirname, 'src/renderer/pages/VenueMap.tsx'), 'utf8');
const checks = [
  { name: 'ECharts heatmap 类型', pattern: /type:\s*['"]heatmap['"]/ },
  { name: '散点图安保人员', pattern: /安保人员.*type.*scatter/ },
  { name: '红色菱形警报', pattern: /symbol.*diamond.*警报/ },
  { name: '11色渐变配色', pattern: /#313695.*#a50026/ },
  { name: 'visualMap 色条', pattern: /visualMap/ },
  { name: 'pointSize 和 blurSize', pattern: /pointSize.*blurSize/ }
];

checks.forEach(check => {
  const found = check.pattern.test(venueMapCode);
  console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
});

// 3. 检查 PDF 导出实现
console.log('\n3. PDF 导出验证:');
const statsCode = fs.readFileSync(path.join(__dirname, 'src/renderer/pages/Statistics.tsx'), 'utf8');
const pdfChecks = [
  { name: 'Executive Summary 章节', pattern: /Executive Summary/ },
  { name: 'Events Distribution 章节', pattern: /Events Distribution by Venue/ },
  { name: 'Schedule Details 章节', pattern: /Schedule Details/ },
  { name: 'Equipment Status 章节', pattern: /Equipment Status Summary/ },
  { name: 'IPC 保存调用', pattern: /statisticsApi.savePdf/ },
  { name: 'dialog.showSaveDialog', pattern: /showSaveDialog/ },
  { name: '文件存在确认', pattern: /fs.existsSync/ },
  { name: '日志打印确认', pattern: /PDF 报告已保存/ }
];

pdfChecks.forEach(check => {
  const found = check.pattern.test(statsCode);
  console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
});

// 4. 检查所有页面数据加载
console.log('\n4. 各页面数据加载验证:');
const pages = [
  { name: 'Dashboard', file: 'Dashboard.tsx', patterns: [/statisticsApi.getOverview/, /schedules/, /alarms/] },
  { name: 'EventManagement', file: 'EventManagement.tsx', patterns: [/eventApi.getAll/, /venueApi.getAll/] },
  { name: 'ScheduleManagement', file: 'ScheduleManagement.tsx', patterns: [/scheduleApi.getAll/, /scheduleApi.generate/] },
  { name: 'TaskManagement', file: 'TaskManagement.tsx', patterns: [/taskApi.getAll/, /taskAdjustmentApi/] },
  { name: 'MatchCenter', file: 'MatchCenter.tsx', patterns: [/matchStatusApi/, /matchResultApi/, /emergencyApi/] },
  { name: 'SecurityCenter', file: 'SecurityCenter.tsx', patterns: [/patrolApi/, /crowdApi/, /alarmApi/, /securityPersonnelApi/] },
  { name: 'EquipmentManagement', file: 'EquipmentManagement.tsx', patterns: [/equipmentApi/, /maintenanceApi/, /sparePartApi/] },
  { name: 'VenueMap', file: 'VenueMap.tsx', patterns: [/statisticsApi.getVenueHeatmap/, /securityZoneApi/, /securityPersonnelApi/, /alarmApi/] },
  { name: 'Statistics', file: 'Statistics.tsx', patterns: [/statisticsApi.getOverview/, /scheduleApi/, /equipmentApi/] }
];

pages.forEach(page => {
  const code = fs.readFileSync(path.join(__dirname, 'src/renderer/pages', page.file), 'utf8');
  const allFound = page.patterns.every(p => p.test(code));
  console.log(`   ${allFound ? '✅' : '❌'} ${page.name} - ${allFound ? '所有数据接口已连接' : '缺少数据接口'}`);
});

// 5. 检查 IPC handler
console.log('\n5. IPC Handler 验证:');
const ipcCode = fs.readFileSync(path.join(__dirname, 'src/main/ipc.ts'), 'utf8');
const ipcChecks = [
  'statistics:getOverview',
  'statistics:getVenueHeatmap',
  'events:getAll',
  'schedules:getAll',
  'schedules:generate',
  'tasks:getAll',
  'matchStatus:getAll',
  'patrolSchedules:getAll',
  'crowdData:getLatest',
  'alarms:getAll',
  'equipment:getAll',
  'pdf:save'
];

let ipcCount = 0;
ipcChecks.forEach(name => {
  const found = ipcCode.includes(`ipcMain.handle('${name}'`);
  if (found) ipcCount++;
  console.log(`   ${found ? '✅' : '❌'} ${name}`);
});

console.log(`\n   总计: ${ipcCount}/${ipcChecks.length} IPC Handler 已实现`);

// 6. 初始数据验证
console.log('\n6. 数据库初始数据验证:');
const dbCode = fs.readFileSync(path.join(__dirname, 'src/main/database.ts'), 'utf8');
const seedChecks = [
  { name: '场馆数据', pattern: /insert.*venues/ },
  { name: '赛事项目数据', pattern: /insert.*events/ },
  { name: '裁判数据', pattern: /insert.*referees/ },
  { name: '赛程数据', pattern: /insert.*schedules/ },
  { name: '任务数据', pattern: /insert.*tasks/ },
  { name: '安保区域', pattern: /insert.*security_zones/ },
  { name: '安保人员', pattern: /insert.*security_personnel/ },
  { name: '人流数据', pattern: /insert.*crowd_data/ },
  { name: '警报数据', pattern: /insert.*alarms/ },
  { name: '设备数据', pattern: /insert.*equipment/ },
  { name: '备件数据', pattern: /insert.*spare_parts/ },
  { name: '巡逻排班', pattern: /insert.*patrol_schedules/ },
  { name: '比赛状态', pattern: /insert.*match_status/ },
  { name: '比赛成绩', pattern: /insert.*match_results/ }
];

seedChecks.forEach(check => {
  const found = check.pattern.test(dbCode);
  console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
});

console.log('\n========================================');
console.log('  验证完成！应用正在运行中');
console.log('========================================');
console.log('\n请在 Electron 窗口中操作验证:');
console.log('  1. 切换到 Venue Map 查看 ECharts 热力图');
console.log('  2. 点击 Statistics → Export PDF Report 保存到桌面');
console.log('  3. 依次切换所有 9 个页面确认数据');

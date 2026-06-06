import initSqlJs from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import dayjs from 'dayjs';

let db: any;
let SQL: any;

interface QueryResult {
  columns: string[];
  values: any[][];
}

function rowsToObjects(result: QueryResult): any[] {
  if (!result || !result.columns || !result.values) return [];
  return result.values.map(row => {
    const obj: any = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export async function initDatabase() {
  SQL = await initSqlJs();
  const dbPath = path.join(app.getPath('userData'), 'sports-event.db');
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  createTables();
  seedInitialData();
  saveDatabase();
}

function saveDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'sports-event.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      capacity INTEGER,
      security_level INTEGER DEFAULT 1,
      status TEXT DEFAULT 'available'
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      venue_id INTEGER,
      participant_count INTEGER,
      estimated_duration INTEGER,
      required_equipment TEXT,
      security_level INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (venue_id) REFERENCES venues(id)
    );

    CREATE TABLE IF NOT EXISTS referees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      qualification TEXT,
      expertise TEXT,
      phone TEXT,
      status TEXT DEFAULT 'available'
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      venue_id INTEGER,
      referee_id INTEGER,
      start_time TEXT,
      end_time TEXT,
      status TEXT DEFAULT 'draft',
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (venue_id) REFERENCES venues(id),
      FOREIGN KEY (referee_id) REFERENCES referees(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER,
      assignee_type TEXT,
      assignee_id INTEGER,
      assignee_name TEXT,
      task_type TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id)
    );

    CREATE TABLE IF NOT EXISTS task_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      applicant_id INTEGER,
      reason TEXT,
      proposed_changes TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_by INTEGER,
      review_note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS match_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER,
      status TEXT DEFAULT 'preparing',
      actual_start TEXT,
      actual_end TEXT,
      notes TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id)
    );

    CREATE TABLE IF NOT EXISTS match_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER,
      athlete_name TEXT,
      score TEXT,
      rank INTEGER,
      fouls INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id)
    );

    CREATE TABLE IF NOT EXISTS emergency_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER,
      incident_type TEXT,
      description TEXT,
      severity TEXT,
      status TEXT DEFAULT 'active',
      notified_medical INTEGER DEFAULT 0,
      notified_security INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id)
    );

    CREATE TABLE IF NOT EXISTS security_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      venue_id INTEGER,
      capacity_threshold INTEGER,
      coordinates TEXT,
      FOREIGN KEY (venue_id) REFERENCES venues(id)
    );

    CREATE TABLE IF NOT EXISTS security_personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rank TEXT,
      phone TEXT,
      current_zone_id INTEGER,
      status TEXT DEFAULT 'available',
      FOREIGN KEY (current_zone_id) REFERENCES security_zones(id)
    );

    CREATE TABLE IF NOT EXISTS patrol_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER,
      personnel_id INTEGER,
      start_time TEXT,
      end_time TEXT,
      status TEXT DEFAULT 'scheduled',
      FOREIGN KEY (zone_id) REFERENCES security_zones(id),
      FOREIGN KEY (personnel_id) REFERENCES security_personnel(id)
    );

    CREATE TABLE IF NOT EXISTS crowd_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      people_count INTEGER,
      anomaly_detected INTEGER DEFAULT 0,
      FOREIGN KEY (zone_id) REFERENCES security_zones(id)
    );

    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER,
      alarm_type TEXT,
      severity TEXT,
      message TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (zone_id) REFERENCES security_zones(id)
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT,
      venue_id INTEGER,
      usage_hours INTEGER DEFAULT 0,
      last_maintenance TEXT,
      status TEXT DEFAULT 'normal',
      FOREIGN KEY (venue_id) REFERENCES venues(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance_work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER,
      description TEXT,
      priority TEXT,
      assigned_team TEXT,
      status TEXT DEFAULT 'pending',
      parts_used TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id)
    );

    CREATE TABLE IF NOT EXISTS spare_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT,
      quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 10
    );

    CREATE TABLE IF NOT EXISTS ticket_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER,
      tickets_sold INTEGER,
      revenue REAL,
      sale_date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id)
    );

    CREATE TABLE IF NOT EXISTS audience_satisfaction (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER,
      rating INTEGER,
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT
    );
  `);
}

function safeCount(table: string): number {
  try {
    const result = db.exec(`SELECT COUNT(*) as count FROM ${table}`);
    if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
      return result[0].values[0][0] as number;
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

function seedInitialData() {
  if (safeCount('users') === 0) {
    insert('users', { username: 'admin', name: '系统管理员', role: 'admin', phone: '13800138000' });
    insert('users', { username: 'director', name: '赛事总监', role: 'director', phone: '13800138001' });
    insert('users', { username: 'security_chief', name: '安保主管', role: 'security_chief', phone: '13800138002' });
  }

  if (safeCount('venues') === 0) {
    insert('venues', { name: '主体育场', location: 'A区1号', capacity: 50000, security_level: 3, status: 'available' });
    insert('venues', { name: '游泳馆', location: 'B区2号', capacity: 10000, security_level: 2, status: 'available' });
    insert('venues', { name: '篮球馆', location: 'C区3号', capacity: 15000, security_level: 2, status: 'available' });
    insert('venues', { name: '网球中心', location: 'D区4号', capacity: 8000, security_level: 1, status: 'available' });
  }

  if (safeCount('referees') === 0) {
    insert('referees', { name: '张明', qualification: '国际级', expertise: '田径,足球', phone: '13900139001', status: 'available' });
    insert('referees', { name: '李华', qualification: '国家级', expertise: '篮球,排球', phone: '13900139002', status: 'available' });
    insert('referees', { name: '王强', qualification: '国际级', expertise: '游泳,跳水', phone: '13900139003', status: 'available' });
    insert('referees', { name: '刘伟', qualification: '国家级', expertise: '网球,羽毛球', phone: '13900139004', status: 'available' });
  }

  if (safeCount('events') === 0) {
    insert('events', { name: '男子100米田径', venue_id: 1, participant_count: 8, estimated_duration: 60, required_equipment: 'timing', security_level: 2, status: 'pending' });
    insert('events', { name: '女子200米自由泳', venue_id: 2, participant_count: 8, estimated_duration: 120, required_equipment: 'timing', security_level: 2, status: 'pending' });
    insert('events', { name: '男篮小组赛A', venue_id: 3, participant_count: 24, estimated_duration: 180, required_equipment: 'scoring', security_level: 3, status: 'pending' });
    insert('events', { name: '网球男单第一轮', venue_id: 4, participant_count: 64, estimated_duration: 240, required_equipment: 'scoring', security_level: 1, status: 'pending' });
    insert('events', { name: '女子4x100米接力', venue_id: 1, participant_count: 32, estimated_duration: 90, required_equipment: 'timing', security_level: 3, status: 'pending' });
    insert('events', { name: '男子10米跳台', venue_id: 2, participant_count: 12, estimated_duration: 150, required_equipment: 'timing', security_level: 2, status: 'pending' });
  }

  if (safeCount('security_zones') === 0) {
    insert('security_zones', { name: '主体育场-东区', venue_id: 1, capacity_threshold: 15000, coordinates: '{"x": 100, "y": 50, "width": 200, "height": 150}' });
    insert('security_zones', { name: '主体育场-西区', venue_id: 1, capacity_threshold: 15000, coordinates: '{"x": 350, "y": 50, "width": 200, "height": 150}' });
    insert('security_zones', { name: '主体育场-南区', venue_id: 1, capacity_threshold: 10000, coordinates: '{"x": 200, "y": 250, "width": 200, "height": 100}' });
    insert('security_zones', { name: '主体育场-北区', venue_id: 1, capacity_threshold: 10000, coordinates: '{"x": 200, "y": 50, "width": 200, "height": 100}' });
    insert('security_zones', { name: '游泳馆-观众区', venue_id: 2, capacity_threshold: 8000, coordinates: '{"x": 50, "y": 50, "width": 300, "height": 200}' });
    insert('security_zones', { name: '篮球馆-观众区', venue_id: 3, capacity_threshold: 12000, coordinates: '{"x": 100, "y": 100, "width": 250, "height": 150}' });
  }

  if (safeCount('security_personnel') === 0) {
    insert('security_personnel', { name: '赵军', rank: '队长', phone: '13700137001', current_zone_id: 1, status: 'on_duty' });
    insert('security_personnel', { name: '孙磊', rank: '队员', phone: '13700137002', current_zone_id: 2, status: 'on_duty' });
    insert('security_personnel', { name: '周涛', rank: '队员', phone: '13700137003', current_zone_id: 3, status: 'on_duty' });
    insert('security_personnel', { name: '吴峰', rank: '队员', phone: '13700137004', current_zone_id: 4, status: 'available' });
    insert('security_personnel', { name: '郑凯', rank: '队员', phone: '13700137005', current_zone_id: 5, status: 'on_duty' });
    insert('security_personnel', { name: '黄强', rank: '队员', phone: '13700137006', current_zone_id: 6, status: 'on_duty' });
  }

  if (safeCount('equipment') === 0) {
    insert('equipment', { name: '电子计时系统A', type: 'timing', venue_id: 1, usage_hours: 120, status: 'normal' });
    insert('equipment', { name: '电子计时系统B', type: 'timing', venue_id: 2, usage_hours: 80, status: 'normal' });
    insert('equipment', { name: '计分牌系统', type: 'scoring', venue_id: 1, usage_hours: 150, status: 'normal' });
    insert('equipment', { name: '灯光系统', type: 'lighting', venue_id: 1, usage_hours: 500, status: 'needs_maintenance' });
    insert('equipment', { name: '音响系统', type: 'audio', venue_id: 3, usage_hours: 200, status: 'normal' });
    insert('equipment', { name: '电子计时系统C', type: 'timing', venue_id: 3, usage_hours: 200, status: 'normal' });
    insert('equipment', { name: '网球计分板', type: 'scoring', venue_id: 4, usage_hours: 90, status: 'normal' });
  }

  if (safeCount('spare_parts') === 0) {
    insert('spare_parts', { name: 'LED灯泡', sku: 'LED-001', quantity: 50, min_stock: 20 });
    insert('spare_parts', { name: '传感器模块', sku: 'SENS-002', quantity: 15, min_stock: 10 });
    insert('spare_parts', { name: '线缆连接器', sku: 'CAB-003', quantity: 100, min_stock: 30 });
  }

  const today = dayjs().format('YYYY-MM-DD');
  if (safeCount('schedules') === 0) {
    insert('schedules', { event_id: 1, venue_id: 1, referee_id: 1, start_time: `${today} 09:00:00`, end_time: `${today} 10:00:00`, status: 'confirmed' });
    insert('schedules', { event_id: 2, venue_id: 2, referee_id: 3, start_time: `${today} 10:30:00`, end_time: `${today} 12:30:00`, status: 'confirmed' });
    insert('schedules', { event_id: 3, venue_id: 3, referee_id: 2, start_time: `${today} 14:00:00`, end_time: `${today} 17:00:00`, status: 'draft' });
    insert('schedules', { event_id: 4, venue_id: 4, referee_id: 4, start_time: `${today} 09:00:00`, end_time: `${today} 13:00:00`, status: 'confirmed' });
    insert('schedules', { event_id: 5, venue_id: 1, referee_id: 1, start_time: `${today} 14:30:00`, end_time: `${today} 16:00:00`, status: 'draft' });
  }

  if (safeCount('tasks') === 0) {
    insert('tasks', { schedule_id: 1, assignee_type: 'referee', assignee_id: 1, assignee_name: '张明', task_type: 'officiate', description: '请于 09:00 前往主体育场执裁男子100米田径', status: 'confirmed' });
    insert('tasks', { schedule_id: 1, assignee_type: 'venue_manager', assignee_id: null, assignee_name: '场馆管理员', task_type: 'venue_prep', description: '请于 08:00 前准备好主体育场', status: 'pending' });
    insert('tasks', { schedule_id: 1, assignee_type: 'security', assignee_id: null, assignee_name: '安保人员', task_type: 'security_duty', description: '男子100米田径安保任务，主体育场', status: 'pending' });
    insert('tasks', { schedule_id: 2, assignee_type: 'referee', assignee_id: 3, assignee_name: '王强', task_type: 'officiate', description: '请于 10:30 前往游泳馆执裁女子200米自由泳', status: 'pending' });
    insert('tasks', { schedule_id: 4, assignee_type: 'referee', assignee_id: 4, assignee_name: '刘伟', task_type: 'officiate', description: '请于 09:00 前往网球中心执裁网球男单第一轮', status: 'confirmed' });
  }

  if (safeCount('crowd_data') === 0) {
    insert('crowd_data', { zone_id: 1, people_count: 8500, anomaly_detected: 0 });
    insert('crowd_data', { zone_id: 2, people_count: 9200, anomaly_detected: 0 });
    insert('crowd_data', { zone_id: 3, people_count: 7800, anomaly_detected: 0 });
    insert('crowd_data', { zone_id: 4, people_count: 5000, anomaly_detected: 0 });
    insert('crowd_data', { zone_id: 5, people_count: 6500, anomaly_detected: 0 });
    insert('crowd_data', { zone_id: 6, people_count: 11000, anomaly_detected: 1 });
  }

  if (safeCount('alarms') === 0) {
    insert('alarms', { zone_id: 6, alarm_type: 'crowd_density', severity: 'high', message: '篮球馆观众区人流密度过高，当前人数: 11000，阈值: 12000', status: 'active' });
    insert('alarms', { zone_id: 1, alarm_type: 'anomaly_behavior', severity: 'medium', message: '主体育场东区检测到异常行为', status: 'acknowledged' });
  }

  if (safeCount('ticket_sales') === 0) {
    insert('ticket_sales', { schedule_id: 1, tickets_sold: 45000, revenue: 2250000 });
    insert('ticket_sales', { schedule_id: 2, tickets_sold: 8500, revenue: 425000 });
    insert('ticket_sales', { schedule_id: 4, tickets_sold: 6000, revenue: 300000 });
  }

  if (safeCount('audience_satisfaction') === 0) {
    insert('audience_satisfaction', { schedule_id: 1, rating: 5, comment: '组织有序，体验很好' });
    insert('audience_satisfaction', { schedule_id: 1, rating: 4, comment: '整体满意' });
    insert('audience_satisfaction', { schedule_id: 2, rating: 5, comment: '赛事精彩' });
    insert('audience_satisfaction', { schedule_id: 4, rating: 4, comment: '不错' });
  }

  if (safeCount('maintenance_work_orders') === 0) {
    insert('maintenance_work_orders', { equipment_id: 4, description: '灯光系统使用时长达到500小时，需要定期维护', priority: 'medium', assigned_team: '维修一组', status: 'assigned' });
  }

  if (safeCount('match_status') === 0) {
    insert('match_status', { schedule_id: 1, status: 'preparing', actual_start: null, actual_end: null, notes: '' });
    insert('match_status', { schedule_id: 4, status: 'ongoing', actual_start: `${today} 09:05:00`, notes: '比赛进行中' });
  }

  if (safeCount('match_results') === 0) {
    insert('match_results', { schedule_id: 4, athlete_name: '选手A', score: '6-4, 6-3', rank: 1, fouls: 0 });
    insert('match_results', { schedule_id: 4, athlete_name: '选手B', score: '4-6, 3-6', rank: 2, fouls: 1 });
  }
}

function insert(table: string, data: Record<string, any>): { lastInsertRowid: number } {
  const keys = Object.keys(data);
  const values = Object.values(data).map(v => {
    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
    if (v === null || v === undefined) return 'NULL';
    return v;
  });
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')})`;
  db.run(sql);
  saveDatabase();
  try {
    const result = db.exec('SELECT last_insert_rowid() as id');
    if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
      return { lastInsertRowid: result[0].values[0][0] as number };
    }
  } catch (e) {
    console.error('Error getting last insert rowid:', e);
  }
  return { lastInsertRowid: 0 };
}

function update(table: string, data: Record<string, any>, where: string): void {
  const setClauses = Object.entries(data).map(([k, v]) => {
    if (typeof v === 'string') return `${k} = '${v.replace(/'/g, "''")}'`;
    if (v === null || v === undefined) return `${k} = NULL`;
    return `${k} = ${v}`;
  }).join(', ');
  const sql = `UPDATE ${table} SET ${setClauses} WHERE ${where}`;
  db.run(sql);
  saveDatabase();
}

function remove(table: string, where: string): void {
  const sql = `DELETE FROM ${table} WHERE ${where}`;
  db.run(sql);
  saveDatabase();
}

function query(sql: string): any[] {
  try {
    const result = db.exec(sql);
    if (result.length === 0) return [];
    return rowsToObjects(result[0]);
  } catch (e) {
    console.error('Query error:', sql, e);
    return [];
  }
}

function getOne(sql: string): any {
  const result = query(sql);
  return result.length > 0 ? result[0] : null;
}

export { db, insert, update, remove, query, getOne, saveDatabase };

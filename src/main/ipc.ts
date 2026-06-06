import { ipcMain } from 'electron';
import { insert, update, remove, query, getOne } from './database';
import dayjs from 'dayjs';

export function registerIpcHandlers() {
  ipcMain.handle('venues:getAll', () => {
    return query('SELECT * FROM venues');
  });

  ipcMain.handle('venues:create', (_, data) => {
    const result = insert('venues', {
      name: data.name,
      location: data.location,
      capacity: data.capacity,
      security_level: data.security_level || 1,
      status: 'available'
    });
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('events:getAll', () => {
    return query(`
      SELECT e.*, v.name as venue_name 
      FROM events e 
      LEFT JOIN venues v ON e.venue_id = v.id
    `);
  });

  ipcMain.handle('events:create', (_, data) => {
    const result = insert('events', {
      name: data.name,
      venue_id: data.venue_id,
      participant_count: data.participant_count,
      estimated_duration: data.estimated_duration,
      required_equipment: data.required_equipment || '',
      security_level: data.security_level || 1,
      status: 'pending'
    });
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('events:update', (_, data) => {
    update('events', {
      name: data.name,
      venue_id: data.venue_id,
      participant_count: data.participant_count,
      estimated_duration: data.estimated_duration,
      required_equipment: data.required_equipment,
      security_level: data.security_level
    }, `id = ${data.id}`);
    return { success: true };
  });

  ipcMain.handle('events:delete', (_, id) => {
    remove('events', `id = ${id}`);
    return { success: true };
  });

  ipcMain.handle('referees:getAll', () => {
    return query('SELECT * FROM referees');
  });

  ipcMain.handle('schedules:generate', (_, params) => {
    const { date } = params;
    const startOfDay = dayjs(date).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const endOfDay = dayjs(date).endOf('day').format('YYYY-MM-DD HH:mm:ss');

    const pendingEvents = query("SELECT * FROM events WHERE status = 'pending'") as any[];
    const venues = query("SELECT * FROM venues WHERE status = 'available'") as any[];
    const referees = query("SELECT * FROM referees WHERE status = 'available'") as any[];

    const existingSchedules = query(`
      SELECT * FROM schedules 
      WHERE start_time >= '${startOfDay}' AND end_time <= '${endOfDay}'
    `) as any[];

    const generatedSchedules: any[] = [];
    let currentTime = dayjs(date).hour(8).minute(0);
    const venueBusy: Record<number, any[]> = {};
    const refereeBusy: Record<number, any[]> = {};

    venues.forEach(v => { venueBusy[v.id] = []; });
    referees.forEach(r => { refereeBusy[r.id] = []; });

    existingSchedules.forEach(s => {
      if (venueBusy[s.venue_id]) venueBusy[s.venue_id].push(s);
      if (refereeBusy[s.referee_id]) refereeBusy[s.referee_id].push(s);
    });

    for (const event of pendingEvents) {
      const suitableVenues = venues.filter(v => v.security_level >= event.security_level);
      const suitableReferees = referees.filter(r => {
        if (!r.expertise) return true;
        const expertise = r.expertise.split(',');
        return expertise.some((e: string) => event.name.includes(e.trim()));
      });

      let scheduled = false;
      for (const venue of suitableVenues) {
        for (const referee of suitableReferees) {
          let slotStartTime = currentTime.clone();
          const slotEndTime = slotStartTime.clone().add(event.estimated_duration, 'minute');

          const venueConflict = venueBusy[venue.id].some((s: any) => {
            const sStart = dayjs(s.start_time);
            const sEnd = dayjs(s.end_time).add(30, 'minute');
            return slotStartTime.isBefore(sEnd) && slotEndTime.isAfter(sStart);
          });

          const refereeConflict = refereeBusy[referee.id].some((s: any) => {
            const sStart = dayjs(s.start_time);
            const sEnd = dayjs(s.end_time);
            return slotStartTime.isBefore(sEnd) && slotEndTime.isAfter(sStart);
          });

          if (!venueConflict && !refereeConflict && slotEndTime.hour() < 22) {
            const newSchedule: any = {
              event_id: event.id,
              venue_id: venue.id,
              referee_id: referee.id,
              start_time: slotStartTime.format('YYYY-MM-DD HH:mm:ss'),
              end_time: slotEndTime.format('YYYY-MM-DD HH:mm:ss'),
              status: 'draft'
            };

            const result = insert('schedules', newSchedule);
            newSchedule.id = result.lastInsertRowid;

            venueBusy[venue.id].push(newSchedule);
            refereeBusy[referee.id].push(newSchedule);
            generatedSchedules.push(newSchedule);

            currentTime = slotEndTime.clone().add(30, 'minute');
            scheduled = true;
            break;
          }
        }
        if (scheduled) break;
      }
    }

    return generatedSchedules;
  });

  ipcMain.handle('schedules:getAll', () => {
    return query(`
      SELECT s.*, e.name as event_name, v.name as venue_name, r.name as referee_name
      FROM schedules s
      LEFT JOIN events e ON s.event_id = e.id
      LEFT JOIN venues v ON s.venue_id = v.id
      LEFT JOIN referees r ON s.referee_id = r.id
      ORDER BY s.start_time
    `);
  });

  ipcMain.handle('schedules:confirm', (_, id) => {
    update('schedules', { status: 'confirmed' }, `id = ${id}`);
    
    const schedule = getOne(`SELECT * FROM schedules WHERE id = ${id}`) as any;
    const event = getOne(`SELECT * FROM events WHERE id = ${schedule.event_id}`) as any;
    const referee = getOne(`SELECT * FROM referees WHERE id = ${schedule.referee_id}`) as any;
    const venue = getOne(`SELECT * FROM venues WHERE id = ${schedule.venue_id}`) as any;

    insert('tasks', {
      schedule_id: id,
      assignee_type: 'referee',
      assignee_id: referee.id,
      assignee_name: referee.name,
      task_type: 'officiate',
      description: `请于 ${schedule.start_time} 前往 ${venue.name} 执裁 ${event.name}`,
      status: 'pending'
    });
    insert('tasks', {
      schedule_id: id,
      assignee_type: 'venue_manager',
      assignee_id: null,
      assignee_name: '场馆管理员',
      task_type: 'venue_prep',
      description: `请于 ${schedule.start_time} 前准备好 ${venue.name}`,
      status: 'pending'
    });
    insert('tasks', {
      schedule_id: id,
      assignee_type: 'security',
      assignee_id: null,
      assignee_name: '安保人员',
      task_type: 'security_duty',
      description: `${event.name} 安保任务，${venue.name}，时间：${schedule.start_time}`,
      status: 'pending'
    });

    return { success: true };
  });

  ipcMain.handle('tasks:getAll', () => {
    return query(`
      SELECT t.*, s.start_time, s.end_time, e.name as event_name, v.name as venue_name
      FROM tasks t
      LEFT JOIN schedules s ON t.schedule_id = s.id
      LEFT JOIN events e ON s.event_id = e.id
      LEFT JOIN venues v ON s.venue_id = v.id
      ORDER BY t.created_at DESC
    `);
  });

  ipcMain.handle('tasks:confirm', (_, id) => {
    update('tasks', { status: 'confirmed' }, `id = ${id}`);
    return { success: true };
  });

  ipcMain.handle('tasks:requestAdjustment', (_, data) => {
    insert('task_adjustments', {
      task_id: data.task_id,
      applicant_id: data.applicant_id,
      reason: data.reason,
      proposed_changes: data.proposed_changes,
      status: 'pending'
    });
    return { success: true };
  });

  ipcMain.handle('taskAdjustments:getAll', () => {
    return query(`
      SELECT ta.*, t.description as task_description, t.assignee_name
      FROM task_adjustments ta
      LEFT JOIN tasks t ON ta.task_id = t.id
      ORDER BY ta.created_at DESC
    `);
  });

  ipcMain.handle('taskAdjustments:review', (_, data) => {
    update('task_adjustments', {
      status: data.status,
      reviewed_by: data.reviewed_by,
      review_note: data.review_note
    }, `id = ${data.id}`);
    return { success: true };
  });

  ipcMain.handle('matchStatus:update', (_, data) => {
    const existing = getOne(`SELECT * FROM match_status WHERE schedule_id = ${data.schedule_id}`);
    
    if (existing) {
      const updateData: any = {
        status: data.status,
        notes: data.notes || '',
        updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
      };
      if (data.actual_start) updateData.actual_start = data.actual_start;
      if (data.actual_end) updateData.actual_end = data.actual_end;
      update('match_status', updateData, `schedule_id = ${data.schedule_id}`);
    } else {
      insert('match_status', {
        schedule_id: data.schedule_id,
        status: data.status,
        actual_start: data.actual_start || null,
        actual_end: data.actual_end || null,
        notes: data.notes || ''
      });
    }

    if (data.status === 'interrupted' || data.emergency) {
      insert('emergency_incidents', {
        schedule_id: data.schedule_id,
        incident_type: data.emergency?.type || 'interruption',
        description: data.emergency?.description || '比赛中断',
        severity: data.emergency?.severity || 'medium',
        notified_medical: 1,
        notified_security: 1
      });
    }

    return { success: true };
  });

  ipcMain.handle('matchStatus:getAll', () => {
    return query(`
      SELECT ms.*, s.start_time, e.name as event_name, v.name as venue_name
      FROM match_status ms
      LEFT JOIN schedules s ON ms.schedule_id = s.id
      LEFT JOIN events e ON s.event_id = e.id
      LEFT JOIN venues v ON s.venue_id = v.id
    `);
  });

  ipcMain.handle('matchResults:add', (_, data) => {
    insert('match_results', {
      schedule_id: data.schedule_id,
      athlete_name: data.athlete_name,
      score: data.score,
      rank: data.rank,
      fouls: data.fouls || 0,
      notes: data.notes || ''
    });
    return { success: true };
  });

  ipcMain.handle('matchResults:getBySchedule', (_, scheduleId) => {
    return query(`SELECT * FROM match_results WHERE schedule_id = ${scheduleId} ORDER BY rank`);
  });

  ipcMain.handle('emergencyIncidents:getAll', () => {
    return query(`
      SELECT ei.*, e.name as event_name, v.name as venue_name
      FROM emergency_incidents ei
      LEFT JOIN schedules s ON ei.schedule_id = s.id
      LEFT JOIN events e ON s.event_id = e.id
      LEFT JOIN venues v ON s.venue_id = v.id
      ORDER BY ei.created_at DESC
    `);
  });

  ipcMain.handle('emergencyIncidents:resolve', (_, id) => {
    update('emergency_incidents', { status: 'resolved' }, `id = ${id}`);
    return { success: true };
  });

  ipcMain.handle('securityZones:getAll', () => {
    return query(`
      SELECT sz.*, v.name as venue_name
      FROM security_zones sz
      LEFT JOIN venues v ON sz.venue_id = v.id
    `);
  });

  ipcMain.handle('securityPersonnel:getAll', () => {
    return query(`
      SELECT sp.*, sz.name as zone_name
      FROM security_personnel sp
      LEFT JOIN security_zones sz ON sp.current_zone_id = sz.id
    `);
  });

  ipcMain.handle('patrolSchedules:generate', (_, params) => {
    const { date } = params;
    const zones = query('SELECT * FROM security_zones') as any[];
    const personnel = query("SELECT * FROM security_personnel WHERE status = 'available'") as any[];

    remove('patrol_schedules', `DATE(start_time) = DATE('${date}')`);

    const schedules: any[] = [];
    let personnelIndex = 0;

    for (let hour = 8; hour < 22; hour += 2) {
      for (const zone of zones) {
        if (personnel.length > 0) {
          const person = personnel[personnelIndex % personnel.length];
          const startTime = dayjs(date).hour(hour).minute(0);
          const endTime = startTime.clone().add(2, 'hour');

          const result = insert('patrol_schedules', {
            zone_id: zone.id,
            personnel_id: person.id,
            start_time: startTime.format('YYYY-MM-DD HH:mm:ss'),
            end_time: endTime.format('YYYY-MM-DD HH:mm:ss'),
            status: 'scheduled'
          });
          
          schedules.push({
            id: result.lastInsertRowid,
            zone_id: zone.id,
            zone_name: zone.name,
            personnel_id: person.id,
            personnel_name: person.name,
            start_time: startTime.format('YYYY-MM-DD HH:mm:ss'),
            end_time: endTime.format('YYYY-MM-DD HH:mm:ss')
          });

          personnelIndex++;
        }
      }
    }

    return schedules;
  });

  ipcMain.handle('patrolSchedules:getAll', () => {
    return query(`
      SELECT ps.*, sz.name as zone_name, sp.name as personnel_name
      FROM patrol_schedules ps
      LEFT JOIN security_zones sz ON ps.zone_id = sz.id
      LEFT JOIN security_personnel sp ON ps.personnel_id = sp.id
      ORDER BY ps.start_time
    `);
  });

  ipcMain.handle('crowdData:add', (_, data) => {
    const zone = getOne(`SELECT * FROM security_zones WHERE id = ${data.zone_id}`) as any;
    const anomaly = data.people_count > zone.capacity_threshold * 0.9;

    insert('crowd_data', {
      zone_id: data.zone_id,
      people_count: data.people_count,
      anomaly_detected: anomaly ? 1 : 0
    });

    if (anomaly) {
      insert('alarms', {
        zone_id: data.zone_id,
        alarm_type: 'crowd_density',
        severity: data.people_count > zone.capacity_threshold ? 'high' : 'medium',
        message: `区域人流密度过高，当前人数: ${data.people_count}，阈值: ${zone.capacity_threshold}`
      });
    }

    return { success: true, anomaly };
  });

  ipcMain.handle('crowdData:getLatest', () => {
    return query(`
      SELECT cd.*, sz.name as zone_name, sz.capacity_threshold
      FROM crowd_data cd
      INNER JOIN (
        SELECT zone_id, MAX(timestamp) as max_ts
        FROM crowd_data
        GROUP BY zone_id
      ) latest ON cd.zone_id = latest.zone_id AND cd.timestamp = latest.max_ts
      LEFT JOIN security_zones sz ON cd.zone_id = sz.id
    `);
  });

  ipcMain.handle('alarms:getAll', () => {
    return query(`
      SELECT a.*, sz.name as zone_name
      FROM alarms a
      LEFT JOIN security_zones sz ON a.zone_id = sz.id
      ORDER BY a.created_at DESC
    `);
  });

  ipcMain.handle('alarms:acknowledge', (_, id) => {
    update('alarms', { status: 'acknowledged' }, `id = ${id}`);
    return { success: true };
  });

  ipcMain.handle('equipment:getAll', () => {
    return query(`
      SELECT e.*, v.name as venue_name
      FROM equipment e
      LEFT JOIN venues v ON e.venue_id = v.id
    `);
  });

  ipcMain.handle('maintenance:getWorkOrders', () => {
    return query(`
      SELECT mwo.*, e.name as equipment_name, v.name as venue_name
      FROM maintenance_work_orders mwo
      LEFT JOIN equipment e ON mwo.equipment_id = e.id
      LEFT JOIN venues v ON e.venue_id = v.id
      ORDER BY mwo.created_at DESC
    `);
  });

  ipcMain.handle('maintenance:generateWorkOrders', () => {
    const equipment = query("SELECT * FROM equipment WHERE usage_hours >= 500 AND status != 'maintenance'") as any[];
    
    const workOrders: any[] = [];
    for (const equip of equipment) {
      const existing = getOne(`SELECT * FROM maintenance_work_orders WHERE equipment_id = ${equip.id} AND status = 'pending'`);
      if (!existing) {
        const result = insert('maintenance_work_orders', {
          equipment_id: equip.id,
          description: `设备使用时长达到 ${equip.usage_hours} 小时，需要定期维护`,
          priority: equip.usage_hours > 800 ? 'high' : 'medium',
          status: 'pending'
        });
        
        update('equipment', { status: 'maintenance' }, `id = ${equip.id}`);
        
        workOrders.push({ id: result.lastInsertRowid, equipment_id: equip.id, equipment_name: equip.name });
      }
    }
    
    return workOrders;
  });

  ipcMain.handle('maintenance:assignTeam', (_, data) => {
    update('maintenance_work_orders', {
      assigned_team: data.team,
      status: 'assigned'
    }, `id = ${data.id}`);
    return { success: true };
  });

  ipcMain.handle('maintenance:complete', (_, data) => {
    update('maintenance_work_orders', {
      status: 'completed',
      parts_used: data.parts_used || ''
    }, `id = ${data.id}`);

    const workOrder = getOne(`SELECT * FROM maintenance_work_orders WHERE id = ${data.id}`) as any;
    update('equipment', {
      status: 'normal',
      usage_hours: 0,
      last_maintenance: dayjs().format('YYYY-MM-DD HH:mm:ss')
    }, `id = ${workOrder.equipment_id}`);

    if (data.parts_used) {
      try {
        const parts = JSON.parse(data.parts_used);
        for (const part of parts) {
          const current = getOne(`SELECT quantity FROM spare_parts WHERE id = ${part.id}`);
          if (current) {
            update('spare_parts', { quantity: Math.max(0, current.quantity - part.quantity) }, `id = ${part.id}`);
          }
        }
      } catch (e) {
        console.error('Error parsing parts:', e);
      }
    }

    return { success: true };
  });

  ipcMain.handle('spareParts:getAll', () => {
    return query('SELECT * FROM spare_parts');
  });

  ipcMain.handle('statistics:getOverview', (_, params) => {
    const { startDate, endDate } = params;
    
    const totalParticipants = getOne(`
      SELECT COALESCE(SUM(e.participant_count), 0) as total
      FROM schedules s
      LEFT JOIN events e ON s.event_id = e.id
      WHERE s.start_time >= '${startDate}' AND s.start_time <= '${endDate}'
    `) as any;

    const totalRevenue = getOne(`
      SELECT COALESCE(SUM(ts.revenue), 0) as total
      FROM ticket_sales ts
      WHERE ts.sale_date >= '${startDate}' AND ts.sale_date <= '${endDate}'
    `) as any;

    const equipmentFailureRate = getOne(`
      SELECT 
        (SELECT COUNT(*) FROM equipment WHERE status = 'needs_maintenance' OR status = 'maintenance') * 100.0 / 
        (SELECT COUNT(*) FROM equipment) as rate
    `) as any;

    const avgSatisfaction = getOne(`
      SELECT COALESCE(AVG(asat.rating), 0) as avg
      FROM audience_satisfaction asat
      WHERE asat.created_at >= '${startDate}' AND asat.created_at <= '${endDate}'
    `) as any;

    const eventsByVenue = query(`
      SELECT v.name as venue, COUNT(s.id) as count
      FROM schedules s
      LEFT JOIN venues v ON s.venue_id = v.id
      WHERE s.start_time >= '${startDate}' AND s.start_time <= '${endDate}'
      GROUP BY v.id, v.name
    `);

    const eventsByType = query(`
      SELECT e.name as event_name, COUNT(s.id) as count
      FROM schedules s
      LEFT JOIN events e ON s.event_id = e.id
      WHERE s.start_time >= '${startDate}' AND s.start_time <= '${endDate}'
      GROUP BY e.id, e.name
    `);

    return {
      totalParticipants: totalParticipants?.total || 0,
      totalRevenue: totalRevenue?.total || 0,
      equipmentFailureRate: equipmentFailureRate?.rate || 0,
      avgSatisfaction: avgSatisfaction?.avg || 0,
      eventsByVenue,
      eventsByType
    };
  });

  ipcMain.handle('statistics:getVenueHeatmap', () => {
    const zones = query('SELECT * FROM security_zones') as any[];
    const result = zones.map(zone => {
      const crowdData = getOne(`
        SELECT people_count 
        FROM crowd_data 
        WHERE zone_id = ${zone.id} 
        ORDER BY timestamp DESC 
        LIMIT 1
      `) as any;

      const personnel = getOne(`
        SELECT COUNT(*) as count 
        FROM security_personnel 
        WHERE current_zone_id = ${zone.id}
      `) as any;

      return {
        ...zone,
        current_people: crowdData?.people_count || 0,
        personnel_count: personnel?.count || 0,
        utilization: crowdData ? (crowdData.people_count / zone.capacity_threshold) * 100 : 0
      };
    });
    return result;
  });

  ipcMain.handle('ticketSales:add', (_, data) => {
    insert('ticket_sales', {
      schedule_id: data.schedule_id,
      tickets_sold: data.tickets_sold,
      revenue: data.revenue
    });
    return { success: true };
  });

  ipcMain.handle('satisfaction:add', (_, data) => {
    insert('audience_satisfaction', {
      schedule_id: data.schedule_id,
      rating: data.rating,
      comment: data.comment || ''
    });
    return { success: true };
  });
}

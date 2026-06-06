const api = (window as any).api || {
  invoke: async () => {}
};

export const venueApi = {
  getAll: () => api.invoke('venues:getAll'),
  create: (data: any) => api.invoke('venues:create', data)
};

export const eventApi = {
  getAll: () => api.invoke('events:getAll'),
  create: (data: any) => api.invoke('events:create', data),
  update: (data: any) => api.invoke('events:update', data),
  delete: (id: number) => api.invoke('events:delete', id)
};

export const refereeApi = {
  getAll: () => api.invoke('referees:getAll')
};

export const scheduleApi = {
  generate: (date: string) => api.invoke('schedules:generate', { date }),
  getAll: () => api.invoke('schedules:getAll'),
  confirm: (id: number) => api.invoke('schedules:confirm', id)
};

export const taskApi = {
  getAll: () => api.invoke('tasks:getAll'),
  confirm: (id: number) => api.invoke('tasks:confirm', id),
  requestAdjustment: (data: any) => api.invoke('tasks:requestAdjustment', data)
};

export const taskAdjustmentApi = {
  getAll: () => api.invoke('taskAdjustments:getAll'),
  review: (data: any) => api.invoke('taskAdjustments:review', data)
};

export const matchStatusApi = {
  getAll: () => api.invoke('matchStatus:getAll'),
  update: (data: any) => api.invoke('matchStatus:update', data)
};

export const matchResultApi = {
  getBySchedule: (scheduleId: number) => api.invoke('matchResults:getBySchedule', scheduleId),
  add: (data: any) => api.invoke('matchResults:add', data)
};

export const emergencyApi = {
  getAll: () => api.invoke('emergencyIncidents:getAll'),
  resolve: (id: number) => api.invoke('emergencyIncidents:resolve', id)
};

export const securityZoneApi = {
  getAll: () => api.invoke('securityZones:getAll')
};

export const securityPersonnelApi = {
  getAll: () => api.invoke('securityPersonnel:getAll')
};

export const patrolApi = {
  generate: (date: string) => api.invoke('patrolSchedules:generate', { date }),
  getAll: () => api.invoke('patrolSchedules:getAll')
};

export const crowdApi = {
  add: (data: any) => api.invoke('crowdData:add', data),
  getLatest: () => api.invoke('crowdData:getLatest')
};

export const alarmApi = {
  getAll: () => api.invoke('alarms:getAll'),
  acknowledge: (id: number) => api.invoke('alarms:acknowledge', id)
};

export const equipmentApi = {
  getAll: () => api.invoke('equipment:getAll')
};

export const maintenanceApi = {
  getWorkOrders: () => api.invoke('maintenance:getWorkOrders'),
  generateWorkOrders: () => api.invoke('maintenance:generateWorkOrders'),
  assignTeam: (data: any) => api.invoke('maintenance:assignTeam', data),
  complete: (data: any) => api.invoke('maintenance:complete', data)
};

export const sparePartApi = {
  getAll: () => api.invoke('spareParts:getAll')
};

export const statisticsApi = {
  getOverview: (startDate: string, endDate: string) => 
    api.invoke('statistics:getOverview', { startDate, endDate }),
  getVenueHeatmap: () => api.invoke('statistics:getVenueHeatmap'),
  savePdf: (base64: string) => api.invoke('pdf:save', base64)
};

export const ticketApi = {
  add: (data: any) => api.invoke('ticketSales:add', data)
};

export const satisfactionApi = {
  add: (data: any) => api.invoke('satisfaction:add', data)
};

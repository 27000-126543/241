import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  TrophyOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  PlayCircleOutlined,
  SafetyOutlined,
  ToolOutlined,
  BarChartOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EventManagement from './pages/EventManagement';
import ScheduleManagement from './pages/ScheduleManagement';
import TaskManagement from './pages/TaskManagement';
import MatchCenter from './pages/MatchCenter';
import SecurityCenter from './pages/SecurityCenter';
import EquipmentManagement from './pages/EquipmentManagement';
import Statistics from './pages/Statistics';
import VenueMap from './pages/VenueMap';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '总览仪表板' },
    { key: '/events', icon: <TrophyOutlined />, label: '赛事项目管理' },
    { key: '/schedules', icon: <CalendarOutlined />, label: '赛程编排' },
    { key: '/tasks', icon: <CheckSquareOutlined />, label: '任务管理' },
    { key: '/matches', icon: <PlayCircleOutlined />, label: '比赛中心' },
    { key: '/security', icon: <SafetyOutlined />, label: '安保管理中心' },
    { key: '/equipment', icon: <ToolOutlined />, label: '设备维保' },
    { key: '/venue-map', icon: <EnvironmentOutlined />, label: '场馆可视化' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '统计报表' },
  ];

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ 
          height: 64, 
          margin: 16, 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: collapsed ? 12 : 16
        }}>
          {collapsed ? 'SEMS' : '体育赛事管理系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {menuItems.find(m => m.key === location.pathname)?.label as string}
          </h2>
        </Header>
        <Content style={{ margin: '24px', overflow: 'auto' }}>
          <div
            style={{
              padding: 24,
              minHeight: '100%',
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/events" element={<EventManagement />} />
              <Route path="/schedules" element={<ScheduleManagement />} />
              <Route path="/tasks" element={<TaskManagement />} />
              <Route path="/matches" element={<MatchCenter />} />
              <Route path="/security" element={<SecurityCenter />} />
              <Route path="/equipment" element={<EquipmentManagement />} />
              <Route path="/venue-map" element={<VenueMap />} />
              <Route path="/statistics" element={<Statistics />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;

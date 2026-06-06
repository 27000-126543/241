import React, { useEffect, useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Tooltip, Tag, Space, Button, Select } from 'antd';
import { EnvironmentOutlined, TeamOutlined, SafetyOutlined, ReloadOutlined } from '@ant-design/icons';
import { statisticsApi, securityZoneApi, securityPersonnelApi, alarmApi } from '../api';
import type { SecurityZone, SecurityPersonnel, Alarm } from '../types';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const { Option } = Select;

const VenueMap: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [personnel, setPersonnel] = useState<SecurityPersonnel[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [heatData, zonesData, personnelData, alarmsData] = await Promise.all([
      statisticsApi.getVenueHeatmap(),
      securityZoneApi.getAll(),
      securityPersonnelApi.getAll(),
      alarmApi.getAll()
    ]);
    setHeatmapData(heatData);
    setZones(zonesData);
    setPersonnel(personnelData);
    setAlarms(alarmsData.filter((a: any) => a.status === 'active'));
  };

  const filteredZones = zones.filter(z => z.venue_id === selectedVenue);
  const filteredHeatData = heatmapData.filter((d: any) => d.venue_id === selectedVenue);
  const filteredPersonnel = personnel.filter(p => {
    const zone = zones.find(z => z.id === p.current_zone_id);
    return zone && zone.venue_id === selectedVenue;
  });

  const totalPeople = filteredHeatData.reduce((sum: number, d: any) => sum + (d.current_people || 0), 0);
  const totalPersonnel = filteredPersonnel.filter(p => p.status === 'on_duty').length;
  const activeAlarms = alarms.filter(a => filteredZones.some(z => z.id === a.zone_id)).length;

  const heatmapOption = useMemo(() => {
    const zoneRects: any[] = [];
    const personnelPoints: any[] = [];
    const alarmPoints: any[] = [];

    filteredHeatData.forEach((zone: any) => {
      let coords;
      try {
        coords = JSON.parse(zone.coordinates);
      } catch {
        coords = { x: 0, y: 0, width: 100, height: 100 };
      }

      const utilization = zone.utilization || 0;
      let color = 'rgba(82, 196, 26, 0.6)';
      if (utilization >= 90) color = 'rgba(255, 77, 79, 0.7)';
      else if (utilization >= 70) color = 'rgba(250, 173, 20, 0.6)';
      else if (utilization >= 50) color = 'rgba(24, 144, 255, 0.6)';

      zoneRects.push({
        name: zone.name,
        value: [
          coords.x + coords.width / 2,
          coords.y + coords.height / 2,
          coords.width,
          coords.height,
          utilization
        ],
        itemStyle: {
          color: color,
          borderColor: '#333',
          borderWidth: 2,
          borderRadius: 4
        },
        label: {
          show: true,
          formatter: `${zone.name}\n${utilization.toFixed(0)}%`,
          fontSize: 12,
          color: '#fff',
          fontWeight: 'bold'
        }
      });

      const zoneAlarms = alarms.filter(a => a.zone_id === zone.id && a.status === 'active');
      if (zoneAlarms.length > 0) {
        alarmPoints.push({
          name: '警报',
          value: [coords.x + coords.width - 20, coords.y + 20],
          symbolSize: 20,
          itemStyle: { color: '#ff4d4f' },
          label: {
            show: true,
            formatter: zoneAlarms.length.toString(),
            color: '#fff',
            fontWeight: 'bold'
          }
        });
      }
    });

    filteredPersonnel.forEach((p, idx) => {
      const zone = zones.find(z => z.id === p.current_zone_id);
      if (zone) {
        let coords;
        try {
          coords = JSON.parse(zone.coordinates);
        } catch {
          coords = { x: 0, y: 0, width: 100, height: 100 };
        }
        personnelPoints.push({
          name: p.name,
          value: [
            coords.x + 30 + (idx % 3) * 25,
            coords.y + coords.height - 30 - Math.floor(idx / 3) * 25
          ],
          symbolSize: 18,
          itemStyle: {
            color: p.status === 'on_duty' ? '#1890ff' : '#8c8c8c',
            borderColor: '#fff',
            borderWidth: 2
          }
        });
      }
    });

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesType === 'custom') {
            const d = params.data;
            return `<strong>${d.name}</strong><br/>使用率: ${d.value[4].toFixed(1)}%`;
          }
          if (params.seriesName === '安保人员') {
            return `<strong>${params.name}</strong><br/>状态: 在岗`;
          }
          if (params.seriesName === '警报') {
            return `<strong>警报</strong><br/>请及时处理`;
          }
          return '';
        }
      },
      grid: {
        left: 40,
        right: 40,
        top: 40,
        bottom: 40
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: 600,
        show: false
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 400,
        show: false,
        inverse: true
      },
      series: [
        {
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const values = api.value(0);
            const centerX = api.coord([values[0], values[1]])[0];
            const centerY = api.coord([values[0], values[1]])[1];
            const width = values[2] * (api.getWidth() / 600);
            const height = values[3] * (api.getHeight() / 400);
            
            return {
              type: 'rect',
              shape: {
                x: centerX - width / 2,
                y: centerY - height / 2,
                width: width,
                height: height
              },
              style: params.style
            };
          },
          data: zoneRects,
          silent: false
        },
        {
          name: '安保人员',
          type: 'scatter',
          data: personnelPoints,
          symbol: 'circle',
          emphasis: { scale: 1.2 }
        },
        {
          name: '警报',
          type: 'scatter',
          data: alarmPoints,
          symbol: 'diamond',
          emphasis: { scale: 1.2 }
        }
      ]
    };
  }, [filteredHeatData, filteredPersonnel, alarms, zones]);

  const utilizationChart = {
    tooltip: { trigger: 'axis' },
    xAxis: { 
      type: 'category', 
      data: filteredHeatData.map((d: any) => d.name),
      axisLabel: { interval: 0, rotate: 30 }
    },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'bar',
      data: filteredHeatData.map((d: any) => ({
        value: d.utilization?.toFixed(1) || 0,
        itemStyle: {
          color: (d.utilization || 0) >= 90 ? '#ff4d4f' : 
                 (d.utilization || 0) >= 70 ? '#faad14' : '#52c41a'
        }
      })),
      label: { show: true, position: 'top', formatter: '{c}%' }
    }],
    grid: { bottom: 80 }
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Select 
            value={selectedVenue} 
            onChange={setSelectedVenue}
            style={{ width: 200 }}
          >
            <Option value={1}>主体育场</Option>
            <Option value={2}>游泳馆</Option>
            <Option value={3}>篮球馆</Option>
            <Option value={4}>网球中心</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新数据</Button>
        </Space>

        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic
                title="当前总人数"
                value={totalPeople}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="在岗安保人员"
                value={totalPersonnel}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="活动警报"
                value={activeAlarms}
                prefix={<SafetyOutlined />}
                valueStyle={{ color: activeAlarms > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="监控区域"
                value={filteredZones.length}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={14}>
          <Card title="场馆热力地图">
            <ReactECharts option={heatmapOption} style={{ height: 400 }} />

            <div style={{ marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Space>
                <div style={{ width: 20, height: 20, background: 'rgba(82, 196, 26, 0.7)', border: '1px solid #52c41a', borderRadius: 4 }} />
                <span>正常 (&lt;50%)</span>
              </Space>
              <Space>
                <div style={{ width: 20, height: 20, background: 'rgba(24, 144, 255, 0.7)', border: '1px solid #1890ff', borderRadius: 4 }} />
                <span>适中 (50-70%)</span>
              </Space>
              <Space>
                <div style={{ width: 20, height: 20, background: 'rgba(250, 173, 20, 0.7)', border: '1px solid #faad14', borderRadius: 4 }} />
                <span>较高 (70-90%)</span>
              </Space>
              <Space>
                <div style={{ width: 20, height: 20, background: 'rgba(255, 77, 79, 0.7)', border: '1px solid #ff4d4f', borderRadius: 4 }} />
                <span>过高 (&gt;90%)</span>
              </Space>
              <Space>
                <div style={{ width: 16, height: 16, background: '#1890ff', borderRadius: '50%', border: '2px solid #fff' }} />
                <span>安保人员</span>
              </Space>
              <Space>
                <div style={{ width: 16, height: 16, background: '#ff4d4f', transform: 'rotate(45deg)' }} />
                <span>警报</span>
              </Space>
            </div>
          </Card>
        </Col>

        <Col span={10}>
          <Card title="各区域使用率" style={{ marginBottom: 16 }}>
            <ReactECharts option={utilizationChart} style={{ height: 280 }} />
          </Card>

          <Card title="安保人员分布">
            {filteredPersonnel.map(p => (
              <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <Tag style={{ marginLeft: 8 }}>{p.rank}</Tag>
                </div>
                <Tag color={p.status === 'on_duty' ? 'green' : 'default'}>
                  {p.zone_name || '待命'}
                </Tag>
              </div>
            ))}
            {filteredPersonnel.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                该场馆暂无安保人员分配
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default VenueMap;

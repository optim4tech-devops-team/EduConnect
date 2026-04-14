import React from 'react';
import { ProLayout, DefaultFooter } from '@ant-design/pro-layout';
import { Avatar, Dropdown, Space, Typography } from 'antd';
import {
  DashboardOutlined, TeamOutlined, UserOutlined, BookOutlined,
  HeartOutlined, CalendarOutlined, SafetyCertificateOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const menuItems = [
  { path: '/', name: 'Panel', icon: <DashboardOutlined /> },
  { path: '/classes', name: 'Sınıflar', icon: <BookOutlined /> },
  { path: '/teachers', name: 'Öğretmenler', icon: <TeamOutlined /> },
  { path: '/students', name: 'Öğrenciler', icon: <UserOutlined /> },
  { path: '/parents', name: 'Veliler', icon: <HeartOutlined /> },
  { path: '/calendar', name: 'Takvim', icon: <CalendarOutlined /> },
  { path: '/compliance', name: 'Uyumluluk', icon: <SafetyCertificateOutlined /> },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, schoolName, logout } = useAuthStore();

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Çıkış Yap',
      onClick: () => { logout(); navigate('/login'); },
    },
  ];

  return (
    <ProLayout
      title="Notio Admin"
      logo="https://notio.app/notio-mark.svg"
      layout="side"
      navTheme="light"
      colorPrimary="#204937"
      fixSiderbar
      fixedHeader
      location={{ pathname: location.pathname }}
      menuItemRender={(item, dom) => (
        <div onClick={() => item.path && navigate(item.path)}>{dom}</div>
      )}
      route={{ routes: menuItems }}
      avatarProps={{
        src: user?.avatarUrl,
        size: 'small',
        title: user?.name,
        render: (_props, dom) => (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              {dom}
            </Space>
          </Dropdown>
        ),
      }}
      actionsRender={() => [
        <Typography.Text key="school" type="secondary" style={{ fontSize: 12 }}>
          {schoolName}
        </Typography.Text>,
      ]}
      footerRender={() => (
        <DefaultFooter
          copyright={`${new Date().getFullYear()} Notio`}
          links={[]}
          style={{ background: 'transparent' }}
        />
      )}
      token={{
        sider: { colorMenuBackground: '#fff' },
        header: { colorBgHeader: '#fff', colorHeaderTitle: '#204937' },
      }}
    >
      <Outlet />
    </ProLayout>
  );
}

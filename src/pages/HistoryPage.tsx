import React from 'react';
import { Card, Typography, List, Tag, Steps, Avatar, Button, Space } from '@douyinfe/semi-ui';
import { IconGithubLogo, IconTickCircle, IconRefresh } from '@douyinfe/semi-icons';
import { useDeploymentStore } from '../store/deploymentStore';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';

const { Title, Text } = Typography;

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { records, loadRecord } = useDeploymentStore();
  const { t } = useI18n();

  const handleRestore = (id: string) => {
    loadRecord(id);
    navigate('/deploy');
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <Title heading={2} className="page-title">{t('activityHistory')}</Title>
        <Text className="page-subtitle">{t('activityHistorySubtitle')}</Text>
      </div>

      <Card className="devops-card" bodyStyle={{ padding: 0 }}>
        {records.length === 0 ? (
           <div style={{ padding: '48px', textAlign: 'center' }}>
             <Text type="tertiary">{t('noHistory')}</Text>
           </div>
        ) : (
          <List
            dataSource={records}
            renderItem={item => (
              <List.Item className="devops-list-item" style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
                  <IconTickCircle size="large" style={{ color: 'var(--semi-color-success)', marginTop: 2 }} />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Text strong>{item.name}</Text>
                      <Tag size="small" type="ghost">{item.id}</Tag>
                      <Text type="tertiary" size="small">{new Date(item.createdAt).toLocaleString()}</Text>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconGithubLogo size="small" style={{ color: 'var(--semi-color-text-2)' }} />
                      <Text>{item.repository.owner}/{item.repository.repo} ({item.repository.branch})</Text>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Avatar size="extra-small" alt="author">Q</Avatar>
                        <Text type="tertiary" size="small">QuantumNous</Text>
                      </div>
                      <Text type="tertiary" size="small">•</Text>
                      <Text type="tertiary" size="small">{t('modeLabel')}: {item.deployMode}</Text>
                    </div>
                    {item.accountNames.length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Text type="tertiary" size="small">{t('currentAccount')}:</Text>
                        <Text type="tertiary" size="small">{item.accountNames.join(', ')}</Text>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-end' }}>
                  <Steps size="small" direction="horizontal" current={3} status={'wait'}>
                    <Steps.Step title={t('buildStep')} />
                    <Steps.Step title={t('deployStep')} />
                    <Steps.Step title={t('readyStep')} />
                  </Steps>
                  <Space>
                     <Button size="small" icon={<IconRefresh />} onClick={() => handleRestore(item.id)}>{t('restoreConfig')}</Button>
                   </Space>
                 </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

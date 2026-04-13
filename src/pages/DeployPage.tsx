import React, { useState } from 'react';
import { Card, Button, Typography, Space, Tag, List, Banner, Toast } from '@douyinfe/semi-ui';
import { IconCode, IconPlay } from '@douyinfe/semi-icons';
import { DeployModal } from '../components/DeployModal';
import { useDeploymentStore } from '../store/deploymentStore';
import { useI18n } from '../hooks/useI18n';

const { Title, Text } = Typography;

export const DeployPage: React.FC = () => {
  const [deployModalVisible, setDeployModalVisible] = useState(false);
  const { currentConfig, records } = useDeploymentStore();
  const { t } = useI18n();
  
  const hasRecords = records.length > 0;
  const latestRecord = hasRecords ? records[0] : null;

  const drafts = hasRecords ? [
    {
      name: currentConfig.projectName,
      type: 'New API',
      description: `${currentConfig.repository.owner}/${currentConfig.repository.repo}`,
      summary: `${currentConfig.deployMode} • ${currentConfig.repository.branch}`,
    },
    ...(currentConfig.deployMode !== 'cluster-slave' && currentConfig.services.useInternalPostgres ? [{
      name: 'postgres',
      type: 'Database',
      description: 'Managed inside the generated template',
      summary: 'Internal PostgreSQL enabled',
    }] : []),
    ...(currentConfig.deployMode !== 'cluster-slave' && currentConfig.services.useInternalRedis ? [{
      name: 'redis',
      type: 'Cache',
      description: 'Managed inside the generated template',
      summary: 'Internal Redis enabled',
    }] : [])
  ] : [];

  const handleDeploy = () => {
    Toast.success(t('deployRecordSuccess'));
    setDeployModalVisible(false);
  };

  const openDeployModal = () => {
    setDeployModalVisible(true);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title heading={2} className="page-title">{t('pageDeployments')}</Title>
          <Text className="page-subtitle">{t('deploymentSubtitle')}</Text>
        </div>
        <Space>
          <Button theme="solid" type="primary" icon={<IconPlay />} onClick={openDeployModal}>{t('createDeployment')}</Button>
        </Space>
      </div>

      {!hasRecords ? (
          <Card className="devops-card" style={{ padding: '48px', textAlign: 'center' }}>
             <Title heading={3} style={{ marginBottom: 16 }}>{t('noDraftsTitle')}</Title>
             <Text type="tertiary" style={{ display: 'block', marginBottom: 24 }}>{t('noDraftsDesc')}</Text>
             <Button size="large" theme="solid" type="primary" icon={<IconPlay />} onClick={openDeployModal}>
               {t('initializeNewApi')}
             </Button>
          </Card>
       ) : (
         <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Banner type="info" closeIcon={null} title="MVP">
              {t('currentMvpBehavior')}
            </Banner>
            <Card className="devops-card" title={<span style={{ fontWeight: 600 }}>{t('generatedServices')}</span>} headerExtraContent={<Text type="tertiary">{t('previewFromDraft')}</Text>}>
              <List
                dataSource={drafts}
                renderItem={item => (
                  <List.Item className="devops-list-item" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'var(--semi-color-bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--semi-color-border)' }}>
                        <IconCode size="large" style={{ color: 'var(--semi-color-text-2)' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Text strong>{item.name}</Text>
                        </div>
                        <Space>
                          <Tag size="small">{item.type}</Tag>
                          <Text type="tertiary" size="small">{item.summary}</Text>
                        </Space>
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Text type="tertiary" size="small">{item.description}</Text>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Card className="devops-card" title={<span style={{ fontWeight: 600 }}>{t('draftSummary')}</span>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="tertiary">{t('deploymentMode')}</Text>
                    <Text><Tag color="cyan">{currentConfig.deployMode}</Tag></Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="tertiary">{t('nodeType')}</Text>
                    <Text><Tag color="blue">{currentConfig.cluster.nodeType}</Tag></Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="tertiary">{t('createdAt')}</Text>
                    <Text>{new Date(latestRecord?.createdAt || Date.now()).toLocaleDateString()}</Text>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="devops-card" title={<span style={{ fontWeight: 600 }}>{t('currentActions')}</span>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                <Button block theme="light" type="tertiary" style={{ justifyContent: 'flex-start' }} onClick={openDeployModal}>{t('editCurrentDraft')}</Button>
                <Button block theme="light" type="tertiary" style={{ justifyContent: 'flex-start' }}>{t('copyYamlFromTemplatePage')}</Button>
                <Button block theme="light" type="tertiary" style={{ justifyContent: 'flex-start' }}>{t('restorePreviousDraft')}</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      <DeployModal 
        visible={deployModalVisible} 
        onCancel={() => setDeployModalVisible(false)} 
        onDeploy={handleDeploy}
      />
    </div>
  );
};

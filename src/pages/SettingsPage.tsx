import React from 'react';
import { Card, Button, Typography, Form, Divider, Select, Toast } from '@douyinfe/semi-ui';
import { IconSave, IconRefresh } from '@douyinfe/semi-icons';
import { useDeploymentStore } from '../store/deploymentStore';
import { useI18n } from '../hooks/useI18n';
import { validateStoredZeaburKey } from '../lib/tauri';

const { Title, Text } = Typography;

export const SettingsPage: React.FC = () => {
  const {
    currentConfig,
    updateConfig,
    resetConfig,
    zeabur,
    addZeaburKey,
    removeZeaburKey,
    switchZeaburKey,
    setZeaburValidationResult,
  } = useDeploymentStore();
  const { t } = useI18n();
  const [newAccountName, setNewAccountName] = React.useState('')
  const [newApiKey, setNewApiKey] = React.useState('')

  const currentKey = zeabur.keys.find((item) => item.id === zeabur.currentKeyId)

  const handleSave = () => {
    Toast.success(t('settingsSaved'));
  };

  const handleReset = () => {
    resetConfig();
    Toast.success(t('configReset'));
  };

  const handleValidateApiKey = async () => {
    if (!currentKey) {
      Toast.error(t('apiKeyValidationFailed'))
      return
    }

    try {
      const result = await validateStoredZeaburKey(currentKey.id)
      if (result.ok) {
        setZeaburValidationResult(currentKey.id, result.message)
        Toast.success(t('apiKeyValidationPassed'))
      } else {
        setZeaburValidationResult(currentKey.id, result.message)
        Toast.error(result.message || t('apiKeyValidationFailed'))
      }
    } catch (error) {
      setZeaburValidationResult(currentKey.id, error instanceof Error ? error.message : t('apiKeyValidationFailed'))
      Toast.error(error instanceof Error ? error.message : t('apiKeyValidationFailed'))
    }
  }

  const handleAddApiKey = async () => {
    if (!newAccountName.trim() || !newApiKey.trim()) {
      Toast.error(t('apiKeyValidationFailed'))
      return
    }
    try {
      await addZeaburKey({ name: newAccountName.trim(), apiKey: newApiKey.trim() })
      setNewAccountName('')
      setNewApiKey('')
      Toast.success(t('apiKeySaved'))
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : t('apiKeyValidationFailed'))
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <Title heading={2} className="page-title">{t('projectSettings')}</Title>
        <Text className="page-subtitle">{t('projectSettingsSubtitle')}</Text>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px' }}>
        <Card className="devops-card" title={<span style={{ fontWeight: 600 }}>{t('generalInformation')}</span>}>
          <Form labelPosition="left" labelWidth={200}>
            <Form.Input 
               field="projectName" 
               label={t('projectName')} 
               initValue={currentConfig.projectName}
               onChange={(v) => updateConfig(c => ({ ...c, projectName: v }))} 
            />
            <Form.Slot label={t('projectId')}>
              <Text code>prj_{Math.random().toString(36).substring(2, 10)}</Text>
            </Form.Slot>
            <Form.Select field="region" label={t('primaryRegion')} initValue="aws-ap-east-1" style={{ width: '100%' }}>
              <Select.Option value="aws-ap-east-1">{t('regionTokyo')}</Select.Option>
              <Select.Option value="aws-us-west-1">{t('regionCalifornia')}</Select.Option>
              <Select.Option value="aws-eu-central-1">{t('regionFrankfurt')}</Select.Option>
            </Form.Select>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" icon={<IconSave />} onClick={handleSave}>{t('saveChanges')}</Button>
            </div>
          </Form>
        </Card>

        <Card className="devops-card" title={<span style={{ fontWeight: 600 }}>{t('zeaburApiConfig')}</span>}>
          <Form labelPosition="left" labelWidth={200}>
            <Form.Input
              field="zeaburAccountName"
              label={t('zeaburAccountName')}
              initValue={newAccountName}
              onChange={(value) => setNewAccountName(value)}
            />
            <Form.Input
              field="zeaburApiKey"
              mode="password"
              label={t('zeaburApiKey')}
              initValue={newApiKey}
              onChange={(value) => setNewApiKey(value)}
            />
            <Form.Slot label="Info">
              <Text type="tertiary">{t('zeaburApiKeyDesc')}</Text>
            </Form.Slot>
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <Button type="primary" onClick={handleAddApiKey}>{t('addApiKey')}</Button>
              <Button type="secondary" onClick={handleValidateApiKey} disabled={!currentKey}>{t('validateApiKey')}</Button>
            </div>
            {zeabur.keys.length === 0 ? (
              <div style={{ marginTop: 12 }}>
                <Text type="tertiary">{t('noApiKeys')}</Text>
              </div>
            ) : null}
            {zeabur.restoreError ? (
              <div style={{ marginTop: 12 }}>
                <Text type="danger">{zeabur.restoreError}</Text>
              </div>
            ) : null}
            {zeabur.restoreWarning ? (
              <div style={{ marginTop: 12 }}>
                <Text type="warning">{zeabur.restoreWarning}</Text>
              </div>
            ) : null}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {zeabur.keys.map((key) => (
                <Card key={key.id} bodyStyle={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <Text strong>{key.name}</Text>
                      <div>
                        <Text type="tertiary" size="small">{key.id}</Text>
                      </div>
                      {key.hasSecret === false ? (
                        <div>
                          <Text type="danger" size="small">Missing secure secret</Text>
                        </div>
                      ) : null}
                      {key.lastValidationMessage ? (
                        <div>
                          <Text type="tertiary" size="small">{key.lastValidationMessage}</Text>
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button type={zeabur.currentKeyId === key.id ? 'primary' : 'tertiary'} size="small" disabled={key.hasSecret === false} onClick={() => switchZeaburKey(key.id)}>{t('switchAccount')}</Button>
                      <Button type="danger" theme="borderless" size="small" onClick={() => void removeZeaburKey(key.id)}>{t('removeAccount')}</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {currentKey?.lastValidationMessage ? (
              <div style={{ marginTop: 12 }}>
                <Text type="tertiary">{currentKey.lastValidationMessage}</Text>
              </div>
            ) : null}
          </Form>
        </Card>

        <Card className="devops-card" title={<span style={{ fontWeight: 600 }}>{t('defaultConfigState')}</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
             <Text type="tertiary">{t('defaultConfigStateDesc')}</Text>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>{t('currentMode')}</Text>
                    <Text>{currentConfig.deployMode}</Text>
                  </div>
                  <Divider />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>{t('repository')}</Text>
                    <Text>{currentConfig.repository.owner}/{currentConfig.repository.repo}</Text>
                  </div>
             </div>

              <div style={{ marginTop: 16 }}>
                 <Button icon={<IconRefresh />} type="secondary" onClick={handleReset}>{t('resetAllConfig')}</Button>
              </div>
          </div>
        </Card>

        <Card className="devops-card" title={<span style={{ fontWeight: 600, color: 'var(--semi-color-danger)' }}>{t('dangerZone')}</span>} style={{ borderColor: 'var(--semi-color-danger)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <Text>{t('deleteProjectDesc')}</Text>
            <div>
              <Button type="danger" theme="solid">{t('deleteProject')}</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

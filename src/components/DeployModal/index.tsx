import React, { useEffect, useState } from 'react';
import { Modal, Steps, Button, Space, Typography, Card, Form, Select, Switch, Toast } from '@douyinfe/semi-ui';
import { IconPlay, IconRefresh } from '@douyinfe/semi-icons';
import { useDeploymentStore } from '../../store/deploymentStore';
import type { DeployMode } from '../../types/deployment';
import { fetchGitHubRepoId, parseGitHubRepository } from '../../utils/github';
import { generateSecret } from '../../utils/secrets';
import { useI18n } from '../../hooks/useI18n';
import { deployTemplateBatch, deployTemplateWithApiKey } from '../../lib/tauri';
import './DeployModal.css';

const { Title, Text } = Typography;

export interface DeployModalProps {
  visible: boolean;
  onCancel: () => void;
  onDeploy: () => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({ visible, onCancel, onDeploy }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fetchingRepoId, setFetchingRepoId] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([])
  const { t } = useI18n()
  
  const { currentConfig, updateConfig, generatedYaml, saveCurrentRecord, saveDraftRecord, zeabur, setZeaburDeployResult, switchZeaburKey } = useDeploymentStore();
  const currentKey = zeabur.keys.find((item) => item.id === zeabur.currentKeyId)

  useEffect(() => {
    if (visible) {
      setCurrentStep(0)
      setBatchMode(false)
      setSelectedKeyIds(zeabur.currentKeyId ? [zeabur.currentKeyId] : [])
    }
  }, [visible, zeabur.currentKeyId])

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 2));
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleModeChange = (mode: DeployMode) => {
    updateConfig(config => ({ ...config, deployMode: mode }));
  };

  const handleRepoChange = (field: string, value: string) => {
    if (field === 'repoUrl') {
      const parsed = parseGitHubRepository(value)
      updateConfig(config => ({
        ...config,
        repository: {
          ...config.repository,
          repoUrl: value,
          owner: parsed.owner || config.repository.owner,
          repo: parsed.repo || config.repository.repo,
        }
      }));
      return
    }

    updateConfig(config => ({
      ...config,
      repository: { ...config.repository, [field]: value }
    }));
  };

  const handleServiceChange = (field: string, value: boolean | string) => {
    updateConfig(config => ({
      ...config,
      services: { ...config.services, [field]: value }
    }));
  };

  const handleClusterChange = (field: string, value: string | boolean | number) => {
    updateConfig(config => ({
      ...config,
      cluster: { ...config.cluster, [field]: value }
    }));
  };

  const handleSecretChange = (field: string, value: string) => {
    updateConfig(config => ({
      ...config,
      secrets: { ...config.secrets, [field]: value }
    }));
  };

  const handleRuntimeChange = (field: string, value: string | boolean) => {
    updateConfig(config => ({
      ...config,
      runtime: { ...config.runtime, [field]: value }
    }));
  };

  const doDeploy = async () => {
    if (!currentKey?.apiKey.trim() && !batchMode) {
      Toast.error(t('apiKeyRequiredBeforeDeploy'))
      return
    }

    if (batchMode && selectedKeyIds.length === 0) {
      Toast.error(t('apiKeyRequiredBeforeDeploy'))
      return
    }

    try {
      setDeploying(true)
      Toast.info(t('deployingToZeabur'))
      if (batchMode) {
        const entries = zeabur.keys
          .filter((key) => selectedKeyIds.includes(key.id))
          .map((key) => ({ keyId: key.id, keyName: key.name, apiKey: key.apiKey }))

        const results = await deployTemplateBatch(entries, generatedYaml)
        results.forEach((result) => {
          setZeaburDeployResult(result.keyId, {
            message: result.message,
            stdout: result.stdout,
            stderr: result.stderr,
          })
        })

        const failed = results.filter((result) => !result.ok)
        if (failed.length > 0) {
          Toast.error(`${t('deployFailed')}: ${failed.map((item) => item.keyName).join(', ')}`)
          return
        }
        saveCurrentRecord({
          accountIds: entries.map((item) => item.keyId),
          accountNames: entries.map((item) => item.keyName),
        })
      } else {
        if (!currentKey) {
          Toast.error(t('apiKeyRequiredBeforeDeploy'))
          return
        }
        const result = await deployTemplateWithApiKey(currentKey.apiKey, generatedYaml)
        setZeaburDeployResult(currentKey.id, {
          message: result.message,
          stdout: result.stdout,
          stderr: result.stderr,
        })
        if (!result.ok) {
          Toast.error(result.message || t('deployFailed'))
          return
        }
        saveCurrentRecord({
          accountIds: [currentKey.id],
          accountNames: [currentKey.name],
        })
      }
      Toast.success(t('deploySuccess'))
      onDeploy();
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : t('deployFailed'))
    } finally {
      setDeploying(false)
    }
  };

  const handleGenerateSecrets = () => {
    updateConfig((config) => ({
      ...config,
      secrets: {
        sessionSecret: config.secrets.sessionSecret || generateSecret(40),
        cryptoSecret: config.secrets.cryptoSecret || generateSecret(40),
      },
    }))
    Toast.success(t('generatedSecretsSuccess'))
  }

  const handleFetchRepoId = async () => {
    try {
      setFetchingRepoId(true)
      const repoId = await fetchGitHubRepoId(currentConfig.repository.owner, currentConfig.repository.repo)
      updateConfig((config) => ({
        ...config,
        repository: {
          ...config.repository,
          repoId,
        },
      }))
      Toast.success(t('fetchedRepoIdSuccess'))
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : t('fetchedRepoIdSuccess'))
    } finally {
      setFetchingRepoId(false)
    }
  }

  const handleSaveDraft = () => {
    saveDraftRecord()
    Toast.success(t('saveDraftSuccess'))
  }

  const renderSourceStep = () => (
    <div className="step-content">
      <div className="step-header">
        <Title heading={4}>{t('deploymentModeAndSource')}</Title>
        <Text type="tertiary">{t('deploymentModeAndSourceDesc')}</Text>
      </div>

      <div className="source-config-section">
        <Form layout="vertical">
            <Form.Select 
              field="deployMode" 
              label={t('deploymentMode')} 
              initValue={currentConfig.deployMode}
              onChange={(v) => handleModeChange(v as DeployMode)}
              style={{ width: '100%' }}
            >
            <Select.Option value="single">{t('singleMode')}</Select.Option>
            <Select.Option value="cluster-master">{t('clusterMasterMode')}</Select.Option>
            <Select.Option value="cluster-slave">{t('clusterSlaveMode')}</Select.Option>
          </Form.Select>

          <Card className="devops-card config-subcard" title={<Text strong>{t('githubRepository')}</Text>}>
            <div className="github-inputs" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Form.Input 
                  field="repoUrl" 
                  label={t('repositoryUrl')} 
                  placeholder="https://github.com/user/repo" 
                  initValue={currentConfig.repository.repoUrl}
                  onChange={v => handleRepoChange('repoUrl', v)}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', gap: 16 }}>
                  <Form.Input 
                    field="owner" 
                    label={t('owner')} 
                    placeholder="QuantumNous" 
                    initValue={currentConfig.repository.owner}
                    onChange={v => handleRepoChange('owner', v)}
                    style={{ flex: 1 }}
                  />
                  <Form.Input 
                    field="repo" 
                    label={t('repositoryName')} 
                    placeholder="new-api" 
                    initValue={currentConfig.repository.repo}
                    onChange={v => handleRepoChange('repo', v)}
                    style={{ flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <Form.Input 
                    field="repoId" 
                    label={t('repositoryId')} 
                    placeholder="e.g. 123456789" 
                    initValue={currentConfig.repository.repoId}
                    onChange={v => handleRepoChange('repoId', v)}
                    style={{ flex: 1 }}
                  />
                  <Form.Input 
                    field="branch" 
                    label={t('branch')} 
                    placeholder="main" 
                    initValue={currentConfig.repository.branch}
                    onChange={v => handleRepoChange('branch', v)}
                    style={{ flex: 1 }}
                  />
                </div>
                <Space>
                  <Button type="secondary" loading={fetchingRepoId} onClick={handleFetchRepoId}>{t('fetchRepoId')}</Button>
                  <Text type="tertiary" size="small">{t('fetchRepoIdHint')}</Text>
                </Space>
            </div>
          </Card>
        </Form>
      </div>
    </div>
  );

  const renderConfigStep = () => (
    <div className="step-content config-step-layout" style={{ gridTemplateColumns: '1fr', overflowY: 'auto' }}>
      <div className="config-form-section">
        <div className="step-header">
          <Title heading={4}>{t('newApiConfiguration')}</Title>
          <Text type="tertiary">{t('newApiConfigurationDesc')}</Text>
        </div>

        <Form layout="vertical">
          {currentConfig.deployMode !== 'cluster-slave' && (
            <Card className="devops-card config-subcard" title={<Text strong>{t('infrastructureServices')}</Text>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ display: 'block' }}>{t('deployInternalPostgres')}</Text>
                    <Text type="tertiary" size="small">{t('deployInternalPostgresDesc')}</Text>
                  </div>
                  <Switch 
                    checked={currentConfig.services.useInternalPostgres} 
                    onChange={v => handleServiceChange('useInternalPostgres', v)} 
                  />
                </div>
                {!currentConfig.services.useInternalPostgres && (
                  <Form.Input
                    field="externalSqlDsn"
                    label={t('externalSqlDsn')}
                    placeholder="postgres://user:pass@host:5432/db"
                    initValue={currentConfig.services.externalSqlDsn}
                    onChange={v => handleServiceChange('externalSqlDsn', v)}
                  />
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <div>
                    <Text strong style={{ display: 'block' }}>{t('deployInternalRedis')}</Text>
                    <Text type="tertiary" size="small">{t('deployInternalRedisDesc')}</Text>
                  </div>
                  <Switch 
                    checked={currentConfig.services.useInternalRedis} 
                    onChange={v => handleServiceChange('useInternalRedis', v)} 
                  />
                </div>
                {!currentConfig.services.useInternalRedis && (
                  <Form.Input
                    field="externalRedisConnString"
                    label={t('externalRedisConnString')}
                    placeholder="redis://:pass@host:6379/0"
                    initValue={currentConfig.services.externalRedisConnString}
                    onChange={v => handleServiceChange('externalRedisConnString', v)}
                  />
                )}
              </div>
            </Card>
          )}

          {currentConfig.deployMode === 'cluster-slave' && (
             <Card className="devops-card config-subcard" title={<Text strong>{t('masterNodeConnection')}</Text>}>
               <Form.Input
                  field="externalSqlDsn"
                  label={t('masterSqlDsnRequired')}
                  placeholder="postgres://user:pass@master-host:5432/db"
                  initValue={currentConfig.services.externalSqlDsn}
                  onChange={v => handleServiceChange('externalSqlDsn', v)}
                />
                <Form.Input
                  field="externalRedisConnString"
                  label={t('masterRedisRequired')}
                  placeholder="redis://:pass@master-host:6379/0"
                  initValue={currentConfig.services.externalRedisConnString}
                  onChange={v => handleServiceChange('externalRedisConnString', v)}
                />
             </Card>
          )}

          <Card className="devops-card config-subcard" title={<Text strong>{t('clusterPerformance')}</Text>} style={{ marginTop: 24 }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
               <Form.InputNumber
                 field="syncFrequency"
                  label={t('syncFrequency')}
                 initValue={currentConfig.cluster.syncFrequency}
                 onChange={v => handleClusterChange('syncFrequency', Number(v))}
                 style={{ width: '100%' }}
               />
               <Form.InputNumber
                 field="batchUpdateInterval"
                  label={t('batchUpdateInterval')}
                 initValue={currentConfig.cluster.batchUpdateInterval}
                 onChange={v => handleClusterChange('batchUpdateInterval', Number(v))}
                 style={{ width: '100%' }}
               />
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <div>
                  <Text strong style={{ display: 'block' }}>{t('batchUpdateEnabled')}</Text>
                  <Text type="tertiary" size="small">{t('batchUpdateEnabledDesc')}</Text>
                </div>
                <Switch 
                  checked={currentConfig.cluster.batchUpdateEnabled} 
                  onChange={v => handleClusterChange('batchUpdateEnabled', v)} 
                />
              </div>
          </Card>

          <Card className="devops-card config-subcard" title={<Text strong>{t('securityRuntime')}</Text>} style={{ marginTop: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Input
                field="sessionSecret"
                label={t('sessionSecret')}
                initValue={currentConfig.secrets.sessionSecret}
                onChange={v => handleSecretChange('sessionSecret', v)}
              />
              <Form.Input
                field="cryptoSecret"
                label={t('cryptoSecret')}
                initValue={currentConfig.secrets.cryptoSecret}
                onChange={v => handleSecretChange('cryptoSecret', v)}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <Button icon={<IconRefresh />} type="secondary" onClick={handleGenerateSecrets}>{t('generateSecrets')}</Button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
               <Form.Input
                  field="frontendBaseUrl"
                  label={t('frontendBaseUrl')}
                  placeholder="e.g. https://chat.my-domain.com"
                  initValue={currentConfig.runtime.frontendBaseUrl}
                  onChange={v => handleRuntimeChange('frontendBaseUrl', v)}
                />
                <Form.Input
                  field="tz"
                  label={t('timezone')}
                  placeholder="Asia/Shanghai"
                  initValue={currentConfig.runtime.tz}
                  onChange={v => handleRuntimeChange('tz', v)}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <div>
                  <Text strong style={{ display: 'block' }}>{t('enableErrorLogging')}</Text>
                </div>
                <Switch 
                  checked={currentConfig.runtime.errorLogEnabled} 
                  onChange={v => handleRuntimeChange('errorLogEnabled', v)} 
                />
            </div>
          </Card>
        </Form>
      </div>
    </div>
  );

  const renderDeployStep = () => (
      <div className="step-content config-step-layout">
      <div className="final-step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="final-icon-container" style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--semi-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: 24 }}>
          <IconPlay size="extra-large" />
        </div>
        <Title heading={3} style={{ marginBottom: '8px' }}>{t('readyToDeploy')}</Title>
        <Text type="tertiary" style={{ display: 'block', maxWidth: '400px', textAlign: 'center', marginBottom: '32px' }}>
          {t('readyToDeployDesc')}
        </Text>
        <Card className="devops-card" bodyStyle={{ width: '100%', padding: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>{t('currentAccount')}</Text>
              <Switch checked={batchMode} onChange={(checked) => setBatchMode(checked)} />
            </div>
            {!batchMode ? (
              <Select value={zeabur.currentKeyId} onChange={(value) => switchZeaburKey(value as string)} style={{ width: '100%' }}>
                {zeabur.keys.map((key) => (
                  <Select.Option key={key.id} value={key.id}>{key.name}</Select.Option>
                ))}
              </Select>
            ) : (
              <Select value={selectedKeyIds} multiple onChange={(value) => setSelectedKeyIds(value as string[])} style={{ width: '100%' }}>
                {zeabur.keys.map((key) => (
                  <Select.Option key={key.id} value={key.id}>{key.name}</Select.Option>
                ))}
              </Select>
            )}
          </div>
        </Card>
      </div>
      
        <div className="config-preview-section">
          <div className="preview-header">
            <Text strong>{t('yamlPreview')}</Text>
            <Text type="tertiary" size="small">{t('autoGenerated')}</Text>
          </div>
          <div className="yaml-preview" style={{ height: '100%', overflowY: 'auto' }}>
            <pre>{generatedYaml}</pre>
          </div>
          {currentKey?.lastDeployMessage ? (
            <div style={{ marginTop: 16, padding: 12, border: '1px solid var(--semi-color-border)', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Zeabur</Text>
              <Text type="tertiary" style={{ display: 'block', marginBottom: 8 }}>{currentKey.lastDeployMessage}</Text>
              {currentKey.lastDeployStdout ? <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#9ef0b6' }}>{currentKey.lastDeployStdout}</pre> : null}
              {currentKey.lastDeployStderr ? <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, color: '#ff9b9b' }}>{currentKey.lastDeployStderr}</pre> : null}
            </div>
          ) : null}
        </div>
      </div>
  );

  return (
    <Modal
      title={t('deployNewApi')}
      visible={visible}
      onCancel={onCancel}
      width={900}
      footer={
        <div className="modal-footer-custom">
          <Button type="tertiary" onClick={onCancel}>{t('cancel')}</Button>
          <Space>
            <Button type="secondary" onClick={handleSaveDraft}>{t('saveDraft')}</Button>
            {currentStep > 0 && <Button onClick={handlePrev} type="secondary">{t('back')}</Button>}
            {currentStep < 2 ? (
              <Button type="primary" theme="solid" onClick={handleNext}>{t('continue')}</Button>
            ) : (
              <Button 
                type="primary" 
                theme="solid" 
                icon={<IconPlay />}
                onClick={doDeploy}
                loading={deploying}
              >
                {t('deployNow')}
              </Button>
            )}
          </Space>
        </div>
      }
      className="deploy-modal-wrapper"
      bodyStyle={{ padding: 0 }}
      closeOnEsc={false}
      maskClosable={false}
    >
      <div className="deploy-modal-content" style={{ height: 650 }}>
        <div className="steps-container">
          <Steps current={currentStep} size="small">
            <Steps.Step title={t('sourceStep')} />
            <Steps.Step title={t('configureStep')} />
            <Steps.Step title={t('previewStep')} />
          </Steps>
        </div>

        <div className="step-body-container">
          {currentStep === 0 && renderSourceStep()}
          {currentStep === 1 && renderConfigStep()}
          {currentStep === 2 && renderDeployStep()}
        </div>
      </div>
    </Modal>
  );
};

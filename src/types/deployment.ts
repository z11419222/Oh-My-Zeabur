export type DeployMode = 'single' | 'cluster-master' | 'cluster-slave'

export interface RepositoryConfig {
  repoUrl: string
  owner: string
  repo: string
  repoId: string
  branch: string
}

export interface ServiceModeConfig {
  useInternalPostgres: boolean
  useInternalRedis: boolean
  externalSqlDsn: string
  externalRedisConnString: string
}

export interface ClusterConfig {
  nodeType: 'master' | 'slave'
  syncFrequency: number
  batchUpdateEnabled: boolean
  batchUpdateInterval: number
}

export interface SecretConfig {
  sessionSecret: string
  cryptoSecret: string
}

export interface RuntimeConfig {
  tz: string
  errorLogEnabled: boolean
  frontendBaseUrl: string
  logSqlDsn: string
}

export interface DeploymentConfig {
  projectName: string
  deployMode: DeployMode
  repository: RepositoryConfig
  services: ServiceModeConfig
  cluster: ClusterConfig
  secrets: SecretConfig
  runtime: RuntimeConfig
}

export interface DeploymentRecord {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  deployMode: DeployMode
  repository: RepositoryConfig
  config: DeploymentConfig
  generatedYaml: string
  accountIds: string[]
  accountNames: string[]
}

export interface ZeaburKeyInfo {
  id: string
  name: string
  apiKey: string
  apiKeyConfiguredAt: string
  lastValidationMessage?: string
  lastDeployMessage?: string
  lastDeployStdout?: string
  lastDeployStderr?: string
}

export interface ZeaburConfig {
  keys: ZeaburKeyInfo[]
  currentKeyId: string
}

export interface BatchDeployResult {
  keyId: string
  keyName: string
  ok: boolean
  message: string
  stdout: string
  stderr: string
}

export const DEFAULT_DEPLOYMENT_CONFIG: DeploymentConfig = {
  projectName: 'mirror-zeabur',
  deployMode: 'single',
  repository: {
    repoUrl: 'https://github.com/QuantumNous/new-api',
    owner: 'QuantumNous',
    repo: 'new-api',
    repoId: '',
    branch: 'main',
  },
  services: {
    useInternalPostgres: true,
    useInternalRedis: true,
    externalSqlDsn: '',
    externalRedisConnString: '',
  },
  cluster: {
    nodeType: 'master',
    syncFrequency: 60,
    batchUpdateEnabled: true,
    batchUpdateInterval: 5,
  },
  secrets: {
    sessionSecret: '',
    cryptoSecret: '',
  },
  runtime: {
    tz: 'Asia/Shanghai',
    errorLogEnabled: true,
    frontendBaseUrl: '',
    logSqlDsn: '',
  },
}

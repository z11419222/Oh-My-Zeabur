use serde::{Deserialize, Serialize};
use std::{io::Write, process::Command};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppEnvironmentInfo {
    platform: String,
    app_name: String,
    app_version: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ZeaburValidationResult {
    ok: bool,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ZeaburDeployResult {
    ok: bool,
    message: String,
    stdout: String,
    stderr: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BatchDeployResult {
    key_id: String,
    key_name: String,
    ok: bool,
    message: String,
    stdout: String,
    stderr: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct BatchDeployEntry {
    key_id: String,
    key_name: String,
    api_key: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ZeaburKeyInfoDto {
    id: String,
    name: String,
    api_key: String,
    api_key_configured_at: String,
    last_validation_message: Option<String>,
    last_deploy_message: Option<String>,
    last_deploy_stdout: Option<String>,
    last_deploy_stderr: Option<String>,
}

#[tauri::command]
fn get_app_environment_info() -> AppEnvironmentInfo {
    AppEnvironmentInfo {
        platform: std::env::consts::OS.to_string(),
        app_name: env!("CARGO_PKG_NAME").to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[tauri::command]
fn validate_zeabur_token(api_key: String) -> ZeaburValidationResult {
    let output = Command::new("npx")
        .args([
            "zeabur@latest",
            "auth",
            "login",
            "--token",
            api_key.as_str(),
        ])
        .output();

    match output {
        Ok(result) if result.status.success() => ZeaburValidationResult {
            ok: true,
            message: "Zeabur API key is valid".to_string(),
        },
        Ok(result) => ZeaburValidationResult {
            ok: false,
            message: String::from_utf8_lossy(&result.stderr).trim().to_string(),
        },
        Err(error) => ZeaburValidationResult {
            ok: false,
            message: format!("Failed to execute Zeabur CLI: {error}"),
        },
    }
}

#[tauri::command]
fn deploy_template_with_api_key(api_key: String, raw_yaml: String) -> ZeaburDeployResult {
    let mut temp_file = match tempfile::Builder::new()
        .prefix("mirrorzeabur-")
        .suffix(".yaml")
        .tempfile()
    {
        Ok(file) => file,
        Err(error) => {
            return ZeaburDeployResult {
                ok: false,
                message: format!("Failed to create temporary YAML file: {error}"),
                stdout: String::new(),
                stderr: String::new(),
            }
        }
    };

    if let Err(error) = write!(temp_file, "{raw_yaml}") {
        return ZeaburDeployResult {
            ok: false,
            message: format!("Failed to write template YAML: {error}"),
            stdout: String::new(),
            stderr: String::new(),
        };
    }

    let temp_path = temp_file.path().to_string_lossy().to_string();

    let login_output = Command::new("npx")
        .args([
            "zeabur@latest",
            "auth",
            "login",
            "--token",
            api_key.as_str(),
        ])
        .output();

    let login_result = match login_output {
        Ok(result) if result.status.success() => result,
        Ok(result) => {
            return ZeaburDeployResult {
                ok: false,
                message: "Zeabur CLI login failed".to_string(),
                stdout: String::from_utf8_lossy(&result.stdout).to_string(),
                stderr: String::from_utf8_lossy(&result.stderr).to_string(),
            }
        }
        Err(error) => {
            return ZeaburDeployResult {
                ok: false,
                message: format!("Failed to execute Zeabur CLI login: {error}"),
                stdout: String::new(),
                stderr: String::new(),
            }
        }
    };

    let deploy_output = Command::new("npx")
        .args([
            "zeabur@latest",
            "template",
            "deploy",
            "-f",
            temp_path.as_str(),
        ])
        .output();

    match deploy_output {
        Ok(result) if result.status.success() => ZeaburDeployResult {
            ok: true,
            message: "Template deployment executed successfully".to_string(),
            stdout: format!(
                "{}{}",
                String::from_utf8_lossy(&login_result.stdout),
                String::from_utf8_lossy(&result.stdout)
            ),
            stderr: String::from_utf8_lossy(&result.stderr).to_string(),
        },
        Ok(result) => ZeaburDeployResult {
            ok: false,
            message: "Zeabur template deploy failed".to_string(),
            stdout: String::from_utf8_lossy(&result.stdout).to_string(),
            stderr: String::from_utf8_lossy(&result.stderr).to_string(),
        },
        Err(error) => ZeaburDeployResult {
            ok: false,
            message: format!("Failed to execute Zeabur CLI deploy: {error}"),
            stdout: String::new(),
            stderr: String::new(),
        },
    }
}

#[tauri::command]
fn deploy_template_batch_with_api_keys(
    entries: Vec<BatchDeployEntry>,
    raw_yaml: String,
) -> Vec<BatchDeployResult> {
    entries
        .into_iter()
        .map(|entry| {
            let result = deploy_template_with_api_key(entry.api_key.clone(), raw_yaml.clone());
            BatchDeployResult {
                key_id: entry.key_id,
                key_name: entry.key_name,
                ok: result.ok,
                message: result.message,
                stdout: result.stdout,
                stderr: result.stderr,
            }
        })
        .collect()
}

#[tauri::command]
fn save_zeabur_keys_to_disk(
    app: tauri::AppHandle,
    keys: Vec<ZeaburKeyInfoDto>,
) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data dir: {error}"))?;
    std::fs::create_dir_all(&app_dir)
        .map_err(|error| format!("Failed to create app data dir: {error}"))?;

    let file_path = app_dir.join("zeabur-keys.json");
    let content = serde_json::to_string_pretty(&keys)
        .map_err(|error| format!("Failed to serialize keys: {error}"))?;
    std::fs::write(file_path, content).map_err(|error| format!("Failed to write keys: {error}"))
}

#[tauri::command]
fn load_zeabur_keys_from_disk(app: tauri::AppHandle) -> Result<Vec<ZeaburKeyInfoDto>, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data dir: {error}"))?;
    let file_path = app_dir.join("zeabur-keys.json");

    if !file_path.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(file_path)
        .map_err(|error| format!("Failed to read keys file: {error}"))?;
    serde_json::from_str(&content).map_err(|error| format!("Failed to parse keys file: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_environment_info,
            validate_zeabur_token,
            deploy_template_with_api_key,
            deploy_template_batch_with_api_keys,
            save_zeabur_keys_to_disk,
            load_zeabur_keys_from_disk
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

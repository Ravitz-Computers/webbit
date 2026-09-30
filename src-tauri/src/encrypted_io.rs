use std::{fs,io::Write};
use tauri_plugin_dialog::DialogExt;
const LIMIT:u64=420_000_000;
#[tauri::command]
pub async fn read_encrypted_package(app:tauri::AppHandle)->Result<Option<String>,String>{
 let Some(file)=app.dialog().file().add_filter("Webbit encrypted package",&["wbe"]).blocking_pick_file() else{return Ok(None)};
 let path=file.as_path().ok_or("Choose a local file")?;let meta=fs::symlink_metadata(path).map_err(super::err)?;
 if super::linked(&meta)||!meta.is_file()||meta.len()>LIMIT{return Err("Choose a regular package under 420 MB".into());}
 Ok(Some(fs::read_to_string(path).map_err(super::err)?))
}
#[tauri::command]
pub async fn write_encrypted_package(app:tauri::AppHandle,data:String)->Result<Option<String>,String>{
 if data.len() as u64>LIMIT{return Err("Encrypted package exceeds 420 MB".into());}
 let envelope:serde_json::Value=serde_json::from_str(&data).map_err(super::err)?;
 if envelope["format"]!="webbit-encrypted"||envelope["version"]!=1{return Err("Expected an encrypted package".into());}
 let Some(file)=app.dialog().file().set_file_name(format!("Webbit-{}.wbe",super::stamp())).add_filter("Webbit encrypted package",&["wbe"]).blocking_save_file() else{return Ok(None)};
 let path=file.as_path().ok_or("Choose a local destination")?;
 // Never overwrite an earlier encrypted snapshot. Every save is a versioned backup.
 let mut output=fs::OpenOptions::new().write(true).create_new(true).open(path).map_err(|e|format!("Choose a new filename; existing backups are never overwritten: {e}"))?;
 output.write_all(data.as_bytes()).map_err(super::err)?;output.sync_all().map_err(super::err)?;
 Ok(Some(path.to_string_lossy().into_owned()))
}

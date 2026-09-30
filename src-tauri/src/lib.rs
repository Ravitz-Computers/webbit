mod encrypted_io;
mod download;
mod browser_preview;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri_plugin_dialog::DialogExt;
use tauri::Manager;
use std::io::Read;

const MAX_TOTAL: usize = 200_000_000;
const MAX_FILE: u64 = 50_000_000;
#[derive(Clone, Serialize)]
struct Snapshot {
    root: String,
    files: BTreeMap<String, String>,
    assets: BTreeMap<String, String>,
    skipped: Vec<String>,
}
#[derive(Default)]
struct Workspace {
    snapshot: Option<Snapshot>,
}
type AppState<'a> = tauri::State<'a, Mutex<Workspace>>;
fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn stamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn valid_path(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 240
        && !name
            .chars()
            .any(|c| ['\\', ':', '<', '>', '"', '|', '?', '*'].contains(&c))
        && !name.chars().any(|c| c.is_control())
        && name.split('/').all(|p| {
            let lower = p.to_ascii_lowercase();
            let stem = lower.split('.').next().unwrap_or("");
            !p.is_empty()
                && p != "."
                && p != ".."
                && !p.ends_with('.')
                && !p.ends_with(' ')
                && ![".git", ".webbit", "node_modules"].contains(&lower.as_str())
                && ![
                    "con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "com5", "com6",
                    "com7", "com8", "com9", "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7",
                    "lpt8", "lpt9",
                ]
                .contains(&stem)
        })
}
fn linked(meta: &fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if meta.file_attributes() & 0x400 != 0 {
            return true;
        }
    }
    meta.file_type().is_symlink()
}
fn confined(root: &Path, name: &str) -> Result<PathBuf, String> {
    if !valid_path(name) {
        return Err(format!("Unsafe project path: {name}"));
    }
    let mut target = root.to_path_buf();
    for part in name.split('/') {
        target.push(part);
        if let Ok(meta) = fs::symlink_metadata(&target) {
            if linked(&meta) {
                return Err(format!("Links are not allowed in project paths: {name}"));
            }
        }
    }
    Ok(target)
}
fn mime(name: &str) -> Option<&'static str> {
    match name.rsplit('.').next()?.to_ascii_lowercase().as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "gif" => Some("image/gif"),
        "webp" => Some("image/webp"),
        "svg" => Some("image/svg+xml"),
        "ico" => Some("image/x-icon"),
        "woff" => Some("font/woff"),
        "woff2" => Some("font/woff2"),
        "ttf" => Some("font/ttf"),
        "otf" => Some("font/otf"),
        "avif" => Some("image/avif"),
        "bmp" => Some("image/bmp"),
        "mp4" => Some("video/mp4"),
        "webm" => Some("video/webm"),
        "mp3" => Some("audio/mpeg"),
        "wav" => Some("audio/wav"),
        "ogg" => Some("audio/ogg"),
        "pdf" => Some("application/pdf"),
        _ => None,
    }
}
fn text_file(name: &str) -> bool {
    name == ".htaccess"
        || name == "_headers"
        || name == "_redirects"
        || [
            "html", "htm", "css", "js", "mjs", "ts", "tsx", "jsx", "php", "json", "md", "txt",
            "xml", "sql", "py", "java", "yml", "yaml", "svg", "cjs", "csv", "scss", "sass", "less", "vue", "svelte", "astro", "map", "webmanifest", "toml", "ini", "conf", "config", "rss", "atom", "xhtml", "htaccess",
        ]
        .contains(
            &name
                .rsplit('.')
                .next()
                .unwrap_or("")
                .to_ascii_lowercase()
                .as_str(),
        )
}
fn excluded(name: &str) -> bool {
    name.split('/').any(|p| {
        let p = p.to_ascii_lowercase();
        [".git", ".webbit", "node_modules", "target", "__macosx", ".ds_store"].contains(&p.as_str()) || p.starts_with(".env")
    })
}
fn empty_snapshot(root: String) -> Snapshot {
    Snapshot { root, files: BTreeMap::new(), assets: BTreeMap::new(), skipped: Vec::new() }
}
fn add_bytes(out: &mut Snapshot, relative: String, bytes: Vec<u8>, total: &mut usize) -> Result<(), String> {
    if !valid_path(&relative) { return Err(format!("Unsafe import path: {relative}")); }
    if out.files.keys().chain(out.assets.keys()).any(|p| p.eq_ignore_ascii_case(&relative)) { return Err(format!("Duplicate import path: {relative}")); }
    *total += bytes.len();
    if bytes.len() as u64 > MAX_FILE || *total > MAX_TOTAL || out.files.len()+out.assets.len() >= 5000 { return Err("Import exceeds 50 MB per file, 200 MB total or 5,000 files".into()); }
    if text_file(&relative) {
        if let Ok(text) = std::str::from_utf8(&bytes) { out.files.insert(relative,text.into()); return Ok(()); }
    }
    let kind = mime(&relative).unwrap_or("application/octet-stream");
    out.assets.insert(relative,format!("data:{kind};base64,{}",STANDARD.encode(bytes)));
    Ok(())
}
fn payload(files: &BTreeMap<String,String>, assets: &BTreeMap<String,String>) -> Result<BTreeMap<String,Vec<u8>>,String> {
    validate_files(files)?;
    let mut output: BTreeMap<String,Vec<u8>> = files.iter().map(|(p,s)|(p.clone(),s.as_bytes().to_vec())).collect();
    for (name,data) in assets {
        if files.contains_key(name) { continue; }
        if !valid_path(name) || !data.starts_with("data:") { return Err("Invalid asset path or encoding".into()); }
        let encoded=data.split_once(";base64,").ok_or("Asset must use base64 encoding")?.1;
        if encoded.len() > (MAX_FILE as usize)*4/3+4 { return Err("Asset exceeds 50 MB".into()); }
        output.insert(name.clone(),STANDARD.decode(encoded).map_err(err)?);
    }
    let mut seen=std::collections::BTreeSet::new();
    for (name,bytes) in &output { if !seen.insert(name.to_lowercase()) || bytes.len() as u64 > MAX_FILE { return Err(format!("Duplicate or oversized file: {name}")); } }
    if output.len()>5000 || output.values().map(Vec::len).sum::<usize>()>MAX_TOTAL { return Err("Project exceeds 200 MB or 5,000 files".into()); }
    for name in output.keys() { let parts:Vec<_>=name.split('/').collect();for n in 1..parts.len(){if seen.contains(&parts[..n].join("/").to_lowercase()){return Err(format!("File/folder collision: {name}"));}} }
    Ok(output)
}
fn read_snapshot(root: &Path) -> Result<Snapshot, String> {
    fn walk(
        root: &Path,
        dir: &Path,
        out: &mut Snapshot,
        total: &mut usize,
        depth: usize,
    ) -> Result<(), String> {
        if depth > 20 {
            return Err("Project nesting is too deep".into());
        }
        for entry in fs::read_dir(dir).map_err(err)? {
            let entry = entry.map_err(err)?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().into_owned();
            if excluded(&name) {
                out.skipped.push(path.strip_prefix(root).map_err(err)?.to_string_lossy().into_owned());
                continue;
            }
            let meta = fs::symlink_metadata(&path).map_err(err)?;
            if linked(&meta) {
                out.skipped.push(format!("{} (link)",path.strip_prefix(root).map_err(err)?.display()));
                continue;
            }
            if meta.is_dir() {
                walk(root, &path, out, total, depth + 1)?;
                continue;
            }
            let relative = path
                .strip_prefix(root)
                .map_err(err)?
                .to_string_lossy()
                .replace('\\', "/");
            if meta.len() > MAX_FILE {
                return Err(format!("File exceeds 50 MB: {relative}"));
            }
            let bytes = fs::read(&path).map_err(err)?;
            add_bytes(out,relative,bytes,total)?;
        }
        Ok(())
    }
    let mut out = empty_snapshot(root.to_string_lossy().into_owned());
    walk(root, root, &mut out, &mut 0, 0)?;
    Ok(out)
}
fn validate_files(files: &BTreeMap<String, String>) -> Result<(), String> {
    if files.len() > 5000 || files.values().map(String::len).sum::<usize>() > MAX_TOTAL {
        return Err("Project exceeds the Beta 1 size limit".into());
    }
    let mut seen = std::collections::BTreeSet::new();
    for name in files.keys() {
        if !valid_path(name) || !seen.insert(name.to_lowercase()) {
            return Err(format!("Unsafe or duplicate path: {name}"));
        }
    }
    Ok(())
}

#[tauri::command]
async fn reset_project(state: AppState<'_>) -> Result<(), String> {
    state.lock().map_err(err)?.snapshot = None;
    Ok(())
}
fn read_zip(path: &Path) -> Result<Snapshot,String> {
    if fs::metadata(path).map_err(err)?.len()>MAX_TOTAL as u64 { return Err("ZIP exceeds 200 MB".into()); }
    let mut archive=zip::ZipArchive::new(fs::File::open(path).map_err(err)?).map_err(err)?;
    if archive.len()>20000 { return Err("Archive contains too many entries".into()); }
    let mut out=empty_snapshot(String::new());let mut total=0;
    for index in 0..archive.len() {
        let mut entry=archive.by_index(index).map_err(err)?;
        // Older Windows ZIP tools store backslashes; normalize before confinement checks.
        let name=entry.name().replace('\\',"/");
        if entry.is_dir(){continue;}
        if excluded(&name) { out.skipped.push(name);continue; }
        if !valid_path(&name) || entry.unix_mode().map(|m|m & 0o170000 == 0o120000).unwrap_or(false) { return Err(format!("Unsafe archive entry: {name}")); }
        if entry.size()>MAX_FILE { return Err(format!("Archive file exceeds 50 MB: {name}")); }
        let mut bytes=Vec::new();Read::take(&mut entry,MAX_FILE+1).read_to_end(&mut bytes).map_err(err)?;
        add_bytes(&mut out,name,bytes,&mut total)?;
    }
    payload(&out.files,&out.assets)?;
    Ok(out)
}
#[tauri::command]
async fn import_content(app: tauri::AppHandle, kind: String) -> Result<Option<Snapshot>,String> {
    if kind=="folder" {
        let Some(folder)=app.dialog().file().blocking_pick_folder() else {return Ok(None)};
        let root=folder.as_path().ok_or("Choose a local folder")?.canonicalize().map_err(err)?;
        return read_snapshot(&root).map(Some);
    }
    if kind=="zip" {
        let Some(file)=app.dialog().file().add_filter("Website ZIP", &["zip"]).blocking_pick_file() else {return Ok(None)};
        return read_zip(file.as_path().ok_or("Choose a local ZIP")?).map(Some);
    }
    if kind!="files" {return Err("Unknown import type".into())}
    let Some(files)=app.dialog().file().blocking_pick_files() else {return Ok(None)};
    let mut out=empty_snapshot(String::new());let mut total=0;
    for file in files {
        let path=file.as_path().ok_or("Choose local files")?;
        let name=path.file_name().ok_or("Invalid filename")?.to_string_lossy().into_owned();
        if excluded(&name) {out.skipped.push(name);continue;}
        let meta=fs::symlink_metadata(path).map_err(err)?;
        if linked(&meta)||!meta.is_file(){return Err("Select regular files, not links".into());}
        if meta.len()>MAX_FILE{return Err(format!("File exceeds 50 MB: {name}"));}
        add_bytes(&mut out,name,fs::read(path).map_err(err)?,&mut total)?;
    }
    payload(&out.files,&out.assets)?;
    Ok(Some(out))
}
#[tauri::command]
async fn open_project(
    app: tauri::AppHandle,
    state: AppState<'_>,
) -> Result<Option<Snapshot>, String> {
    let Some(folder) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let root = folder
        .as_path()
        .ok_or("Choose a local folder")?
        .canonicalize()
        .map_err(err)?;
    let snapshot = read_snapshot(&root)?;
    state.lock().map_err(err)?.snapshot = Some(snapshot.clone());
    Ok(Some(snapshot))
}
#[tauri::command]
async fn save_project(
    app: tauri::AppHandle,
    state: AppState<'_>,
    files: BTreeMap<String, String>,
    assets: BTreeMap<String, String>,
    save_as: bool,
) -> Result<Option<Snapshot>, String> {
    let data = payload(&files,&assets)?;
    let previous = state.lock().map_err(err)?.snapshot.clone();
    let (root, original) = if save_as || previous.is_none() {
        let Some(folder) = app.dialog().file().blocking_pick_folder() else {
            return Ok(None);
        };
        let root = folder
            .as_path()
            .ok_or("Choose a local folder")?
            .canonicalize()
            .map_err(err)?;
        if fs::read_dir(&root).map_err(err)?.next().is_some() {
            return Err("Choose an empty folder for a new project".into());
        }
        (root, None)
    } else {
        let snapshot = previous.unwrap();
        (PathBuf::from(&snapshot.root), Some(snapshot))
    };
    // Check every target before writing. External changes must be reviewed rather than overwritten.
    let original_data = match &original { Some(s) => payload(&s.files,&s.assets)?, None => BTreeMap::new() };
    for (name, _) in &data {
        let target = confined(&root, name)?;
        let expected = original_data.get(name);
        if target.exists() {
            let disk = fs::read(&target).map_err(err)?;
            if Some(&disk) != expected {
                return Err(format!(
                    "External changes in {name}. Reload or save to a new folder."
                ));
            }
        } else if expected.is_some() {
            return Err(format!(
                "{name} was removed externally. Reload before saving."
            ));
        }
    }
    let backup = root
        .join(".webbit")
        .join("backups")
        .join(stamp().to_string());
    // Refuse a redirected metadata directory as well as redirected site files.
    for dir in [root.join(".webbit"), root.join(".webbit/backups")] {
        if let Ok(meta) = fs::symlink_metadata(dir) {
            if linked(&meta) {
                return Err("Backup directory must not be a link".into());
            }
        }
    }
    for (name, content) in &data {
        if original_data.get(name) == Some(content) {
            continue;
        }
        let target = confined(&root, name)?;
        fs::create_dir_all(target.parent().unwrap()).map_err(err)?;
        if target.exists() {
            let copy = backup.join(name);
            fs::create_dir_all(copy.parent().unwrap()).map_err(err)?;
            fs::copy(&target, copy).map_err(err)?;
        }
        let temp = target.with_file_name(format!(
            ".webbit-temp-{}-{}",
            stamp(),
            target.file_name().unwrap().to_string_lossy()
        ));
        use std::io::Write;
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .map_err(err)?;
        file.write_all(content).map_err(err)?;
        file.sync_all().map_err(err)?;
        drop(file);
        fs::rename(&temp, &target).map_err(err)?;
    }
    let snapshot = read_snapshot(&root)?;
    state.lock().map_err(err)?.snapshot = Some(snapshot.clone());
    Ok(Some(snapshot))
}
#[tauri::command]
async fn check_project(state: AppState<'_>) -> Result<bool, String> {
    let Some(previous) = state.lock().map_err(err)?.snapshot.clone() else {
        return Ok(false);
    };
    let current = read_snapshot(Path::new(&previous.root))?;
    Ok(current.files != previous.files || current.assets != previous.assets)
}
#[tauri::command]
async fn reload_project(state: AppState<'_>) -> Result<Snapshot, String> {
    let previous = state
        .lock()
        .map_err(err)?
        .snapshot
        .clone()
        .ok_or("No folder is open")?;
    let snapshot = read_snapshot(Path::new(&previous.root))?;
    state.lock().map_err(err)?.snapshot = Some(snapshot.clone());
    Ok(snapshot)
}
#[tauri::command]
async fn export_site(
    app: tauri::AppHandle,
    files: BTreeMap<String, String>,
    assets: BTreeMap<String,String>,
    asset_prefix: Option<String>,
) -> Result<Option<String>, String> {
    let prefix = asset_prefix.unwrap_or_default();
    if prefix != "" && prefix != "public/" { return Err("Unsupported asset destination".into()); }
    let assets=assets.into_iter().map(|(p,v)|(format!("{prefix}{p}"),v)).collect();
    let data=payload(&files,&assets)?;
    let Some(folder) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let root = folder
        .as_path()
        .ok_or("Choose a local folder")?
        .join(format!("Webbit-export-{}", stamp()));
    fs::create_dir(&root).map_err(err)?;
    for (name, data) in &data {
        let target = confined(&root, name)?;
        fs::create_dir_all(target.parent().unwrap()).map_err(err)?;
        fs::write(target, data).map_err(err)?;
    }
    Ok(Some(root.to_string_lossy().into_owned()))
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app,_,_| {
            if let Some(window)=app.get_webview_window("main") {let _=window.unminimize();let _=window.show();let _=window.set_focus();}
        }))
        .manage(Mutex::new(Workspace::default()))
        .manage(browser_preview::PreviewState::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            encrypted_io::read_encrypted_package,
            encrypted_io::write_encrypted_package,
            download::download_resource,
            browser_preview::preview_site,
            browser_preview::open_external_link,
            browser_preview::stop_preview,
            reset_project,
            open_project,
            save_project,
            check_project,
            reload_project,
            export_site,
            import_content
        ])
        .run(tauri::generate_context!())
        .expect("error while running Webbit");
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Temporary(PathBuf);
    impl Temporary {
        fn new(label:&str)->Self {let root=std::env::temp_dir().canonicalize().unwrap().join(format!("webbit-import-test-{label}-{}",stamp()));fs::create_dir(&root).unwrap();Self(root)}
    }
    impl Drop for Temporary {
        fn drop(&mut self){let root=self.0.canonicalize().unwrap();assert!(root.starts_with(std::env::temp_dir().canonicalize().unwrap()));assert!(root.file_name().unwrap().to_string_lossy().starts_with("webbit-import-test-"));fs::remove_dir_all(root).unwrap();}
    }
    fn make_zip(path:&Path,entries:&[(&str,&[u8])]) {
        use std::io::Write;
        let mut writer=zip::ZipWriter::new(fs::File::create(path).unwrap());
        for (name,bytes) in entries {writer.start_file(*name,zip::write::SimpleFileOptions::default()).unwrap();writer.write_all(bytes).unwrap();}
        writer.finish().unwrap();
    }
    #[test]
    fn whole_folder_preserves_binary_and_script_bytes() {
        let temp=Temporary::new("folder");fs::create_dir(temp.0.join("dist")).unwrap();
        fs::write(temp.0.join("dist/index.html"),b"<h1>Imported</h1>").unwrap();
        fs::write(temp.0.join("app.js"),b"console.log('retained');").unwrap();
        fs::write(temp.0.join("photo.jpeg"),[0xff,0xd8,0,1,0xff,0xd9]).unwrap();
        fs::write(temp.0.join("brochure.pdf"),b"%PDF-1.7\0data").unwrap();
        fs::write(temp.0.join(".env"),b"PRIVATE=not-imported").unwrap();
        let site=read_snapshot(&temp.0).unwrap();let bytes=payload(&site.files,&site.assets).unwrap();
        assert_eq!(site.files["app.js"],"console.log('retained');");assert!(site.files.contains_key("dist/index.html"));
        assert_eq!(bytes["photo.jpeg"],vec![0xff,0xd8,0,1,0xff,0xd9]);assert_eq!(bytes["brochure.pdf"],b"%PDF-1.7\0data");
        assert!(!bytes.contains_key(".env"));assert_eq!(site.skipped,vec![".env"]);
    }
    #[test]
    fn zip_import_retains_relative_paths_without_extracting() {
        let temp=Temporary::new("zip");let path=temp.0.join("site.zip");
        make_zip(&path,&[("site/index.html",b"<h1>Site</h1>"),("site/images/a.jpg",&[0xff,0,0xd8]),("site/.env",b"private"),("site\\css\\style.css",b"body{color:red}")]);
        let site=read_zip(&path).unwrap();assert!(site.files.contains_key("site/index.html"));assert!(site.assets.contains_key("site/images/a.jpg"));assert_eq!(site.skipped,vec!["site/.env"]);
        assert!(site.files.contains_key("site/css/style.css"));
        assert!(!temp.0.join("site").exists());
    }
    #[test]
    fn unsafe_or_case_colliding_zip_entries_are_rejected() {
        let temp=Temporary::new("unsafe-zip");let path=temp.0.join("unsafe.zip");
        make_zip(&path,&[("../escape.js",b"bad")]);assert!(read_zip(&path).is_err());
        make_zip(&path,&[("Photo.jpg",b"one"),("photo.jpg",b"two")]);assert!(read_zip(&path).is_err());
    }
    #[test]
    fn payload_rejects_malformed_assets_and_file_folder_collisions() {
        let mut assets=BTreeMap::new();assets.insert("image.jpg".into(),"data:image/jpeg;base64,!invalid!".into());assert!(payload(&BTreeMap::new(),&assets).is_err());
        let files=BTreeMap::from([("assets".into(),"file".into()),("assets/a.js".into(),"code".into())]);assert!(payload(&files,&BTreeMap::new()).is_err());
    }
    #[test]
    fn paths_are_confined() {
        for name in [
            "../secret",
            "/etc/passwd",
            "C:/Windows/test",
            "x:secret",
            "a\\b",
            "CON.txt",
            "a/../b",
            ".git/config",
        ] {
            assert!(!valid_path(name), "{name}");
        }
        assert!(valid_path("assets/images/hero.png"));
    }
}



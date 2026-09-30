//! Loopback-only, in-memory static preview. No filesystem reads or server-code execution.
use std::{collections::BTreeMap,io::{Read,Write},net::{TcpListener,TcpStream},sync::{Arc,Mutex,atomic::{AtomicBool,Ordering}},time::Duration};
#[derive(Default)]
pub struct PreviewState(pub Mutex<Option<Arc<AtomicBool>>>);
fn public_static(path:&str)->bool {
 if !super::valid_path(path)||path.split('/').any(|p|p.eq_ignore_ascii_case("private")||p.starts_with('.')){return false;}
 let lower=path.to_ascii_lowercase();
 if ["webbit.json","webbit.manager.json","webbit_ai.md"].contains(&lower.as_str()){return false;}
 matches!(lower.rsplit('.').next().unwrap_or(""),"html"|"htm"|"css"|"js"|"mjs"|"json"|"txt"|"xml"|"webmanifest"|"png"|"jpg"|"jpeg"|"gif"|"webp"|"svg"|"ico"|"avif"|"bmp"|"woff"|"woff2"|"ttf"|"otf"|"mp4"|"webm"|"mp3"|"wav"|"ogg"|"pdf")
}
fn content_type(path:&str)->&'static str {match path.rsplit('.').next().unwrap_or("").to_ascii_lowercase().as_str(){"html"|"htm"=>"text/html; charset=utf-8","css"=>"text/css; charset=utf-8","js"|"mjs"=>"text/javascript; charset=utf-8","json"=>"application/json","txt"=>"text/plain; charset=utf-8","xml"=>"application/xml","webmanifest"=>"application/manifest+json",_=>super::mime(path).unwrap_or("application/octet-stream")}}
fn decode_path(raw:&str)->Option<String>{let raw=raw.split('?').next()?.strip_prefix('/')?;let bytes=raw.as_bytes();let mut out=Vec::new();let mut i=0;while i<bytes.len(){if bytes[i]==b'%' {if i+2>=bytes.len(){return None;}let hex=std::str::from_utf8(&bytes[i+1..i+3]).ok()?;out.push(u8::from_str_radix(hex,16).ok()?);i+=3;}else{out.push(bytes[i]);i+=1;}}String::from_utf8(out).ok()}
fn serve(mut stream:TcpStream,data:&BTreeMap<String,Vec<u8>>,entry:&str,host:&str){
 let _=stream.set_read_timeout(Some(Duration::from_millis(500)));let _=stream.set_write_timeout(Some(Duration::from_secs(2)));
 let mut request=Vec::new();let mut chunk=[0u8;1024];while request.len()<8192{match stream.read(&mut chunk){Ok(0)|Err(_)=>return,Ok(n)=>request.extend_from_slice(&chunk[..n])}if request.windows(4).any(|w|w==b"\r\n\r\n"){break;}}
 let request=String::from_utf8_lossy(&request);let mut lines=request.lines();let first=lines.next().unwrap_or("");let parts:Vec<_>=first.split_whitespace().collect();
 let mut status="404 Not Found";let mut body:&[u8]=b"Not found in the static preview. Server code is not executed.";let mut kind="text/plain; charset=utf-8";
 let headers:Vec<_>=lines.take_while(|l|!l.is_empty()).collect();
 let correct_host=headers.iter().any(|l|l.split_once(':').is_some_and(|(k,v)|k.eq_ignore_ascii_case("host")&&v.trim()==host));
 if !correct_host{status="403 Forbidden";body=b"Invalid preview host";}
 else if parts.len()!=3||!matches!(parts[0],"GET"|"HEAD"){status="405 Method Not Allowed";body=b"Preview only supports GET and HEAD";}
 else if let Some(mut path)=decode_path(parts[1]){if path.is_empty(){path=entry.into();}else if path.ends_with('/'){path.push_str("index.html");}if public_static(&path){if let Some(bytes)=data.get(&path){status="200 OK";body=bytes;kind=content_type(&path);}}}
 let header=format!("HTTP/1.1 {status}\r\nContent-Type: {kind}\r\nContent-Length: {}\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",body.len());let _=stream.write_all(header.as_bytes());if parts.first()!=Some(&"HEAD"){let _=stream.write_all(body);}
}
#[tauri::command]
pub fn stop_preview(state:tauri::State<PreviewState>)->Result<(),String>{if let Some(stop)=state.0.lock().map_err(super::err)?.take(){stop.store(true,Ordering::Relaxed);}Ok(())}
#[tauri::command]
pub fn preview_site(state:tauri::State<PreviewState>,files:BTreeMap<String,String>,assets:BTreeMap<String,String>,entry:String)->Result<String,String>{
 if !entry.to_ascii_lowercase().ends_with(".html")&&!entry.to_ascii_lowercase().ends_with(".htm"){return Err("Choose an HTML page. PHP requires a configured server.".into());}
 let data=super::payload(&files,&assets)?.into_iter().filter(|(path,_)|public_static(path)).collect::<BTreeMap<_,_>>();if !data.contains_key(&entry){return Err("Preview page was not found".into());}
 let listener=TcpListener::bind("127.0.0.1:0").map_err(super::err)?;listener.set_nonblocking(true).map_err(super::err)?;let host=listener.local_addr().map_err(super::err)?.to_string();
 let encoded=entry.bytes().map(|b|if b.is_ascii_alphanumeric()||b"-._~/".contains(&b){(b as char).to_string()}else{format!("%{b:02X}")}).collect::<String>();let url=format!("http://{host}/{encoded}");
 let stop=Arc::new(AtomicBool::new(false));let worker_stop=stop.clone();
 let mut state=state.0.lock().map_err(super::err)?;if let Some(old)=state.replace(stop){old.store(true,Ordering::Relaxed);}
 std::thread::spawn(move||{while !worker_stop.load(Ordering::Relaxed){match listener.accept(){Ok((stream,_))=>serve(stream,&data,&entry,&host),Err(e) if e.kind()==std::io::ErrorKind::WouldBlock=>std::thread::sleep(Duration::from_millis(30)),Err(_)=>break}}});
 launch_browser(&url)?;
 Ok(url)
}
fn launch_browser(url:&str)->Result<(),String>{
 #[cfg(windows)]{use std::os::windows::process::CommandExt;std::process::Command::new("rundll32.exe").args(["url.dll,FileProtocolHandler",url]).creation_flags(0x08000000).spawn().map_err(super::err)?;}
 #[cfg(target_os="macos")] {std::process::Command::new("open").arg(url).spawn().map_err(super::err)?;}
 #[cfg(target_os="linux")] {std::process::Command::new("xdg-open").arg(url).spawn().map_err(super::err)?;}
 Ok(())
}
fn external_web_url(raw:&str)->Result<String,String>{
 if raw.len()>8192||raw.chars().any(|c|c.is_control()){return Err("Invalid web address".into());}
 let url=reqwest::Url::parse(raw).map_err(|_|"Invalid web address")?;
 if !matches!(url.scheme(),"http"|"https")||url.host_str().is_none()||!url.username().is_empty()||url.password().is_some(){return Err("Only HTTP and HTTPS web links without credentials can be opened".into());}
 Ok(url.to_string())
}
#[tauri::command]
pub fn open_external_link(url:String)->Result<(),String>{launch_browser(&external_web_url(&url)?)}

#[cfg(test)]mod tests{use super::*;
 #[test]fn external_browser_links_are_http_only(){for raw in ["file:///C:/Windows", "javascript:alert(1)", "data:text/html,test", "https://user:pass@example.com", "https://example.com/\n"]{assert!(external_web_url(raw).is_err());}assert_eq!(external_web_url("https://example.com/about#hours").unwrap(),"https://example.com/about#hours");}

 #[test]fn excludes_private_and_server_sources(){for p in ["private/data/a.json",".env","db.sqlite","index.php","api.py","webbit.json","../index.html"]{assert!(!public_static(p),"{p}");}assert!(public_static("assets/app.js"));}
 #[test]fn decodes_unicode_and_rejects_traversal(){assert_eq!(decode_path("/hello%20world.html?x=1"),Some("hello world.html".into()));assert!(!public_static(&decode_path("/%2e%2e/secret.txt").unwrap()));assert!(decode_path("/%XX").is_none());}
 #[test]fn serves_only_snapshot_and_valid_host(){let listener=TcpListener::bind("127.0.0.1:0").unwrap();let host=listener.local_addr().unwrap().to_string();let address=host.clone();let data=BTreeMap::from([("index.html".into(),b"<h1>Preview</h1>".to_vec())]);let thread=std::thread::spawn(move||{let(s,_)=listener.accept().unwrap();serve(s,&data,"index.html",&host);});let mut client=TcpStream::connect(&address).unwrap();write!(client,"GET / HTTP/1.1\r\nHost: {address}\r\n\r\n").unwrap();let mut result=String::new();client.read_to_string(&mut result).unwrap();thread.join().unwrap();assert!(result.contains("200 OK"));assert!(result.ends_with("<h1>Preview</h1>"));}
}

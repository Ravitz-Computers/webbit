use base64::{engine::general_purpose::STANDARD,Engine};
use serde::Serialize;
use std::{io::Read,time::Duration};
#[derive(Serialize)]pub struct Download {url:String,mime:String,data:String}
fn validate(raw:&str)->Result<reqwest::Url,String>{let url=reqwest::Url::parse(raw).map_err(super::err)?;if url.scheme()!="https"||!url.username().is_empty()||url.password().is_some()||url.host_str().is_none(){return Err("Use a public HTTPS URL without embedded credentials.".into());}Ok(url)}
#[tauri::command]
pub async fn download_resource(url:String)->Result<Download,String>{
 tauri::async_runtime::spawn_blocking(move||{
  let url=validate(&url)?;let origin=url.origin();
  let client=reqwest::blocking::Client::builder().timeout(Duration::from_secs(15)).connect_timeout(Duration::from_secs(8)).redirect(reqwest::redirect::Policy::custom(move|attempt|{if attempt.previous().len()>=5||attempt.url().origin()!=origin {attempt.stop()}else{attempt.follow()}})).user_agent("Webbit/0.1 website import").build().map_err(super::err)?;
  let response=client.get(url).send().map_err(super::err)?;if !response.status().is_success(){return Err(format!("HTTP {}. Enter the final HTTPS page URL if the site redirects to another domain.",response.status()));}
  let final_url=response.url().to_string();let mime=response.headers().get("content-type").and_then(|v|v.to_str().ok()).unwrap_or("application/octet-stream").split(';').next().unwrap_or("application/octet-stream").to_string();
  let mut bytes=Vec::new();response.take(5_000_001).read_to_end(&mut bytes).map_err(super::err)?;if bytes.len()>5_000_000{return Err("Resource exceeds 5 MB.".into());}
  Ok(Download{url:final_url,mime,data:STANDARD.encode(bytes)})
 }).await.map_err(super::err)?
}
#[cfg(test)]mod tests{use super::*;#[test]fn accepts_only_https_without_credentials(){assert!(validate("https://example.com").is_ok());for raw in ["file:///secret","http://example.com","https://user:password@example.com"]{assert!(validate(raw).is_err());}}}

import {accessConfig,addMemberExport} from './member-export';
import {analyzeSite} from './manager';
import {publicFiles,type SiteProject} from './project';
import {managerSchema} from './manager';
const runtime=import.meta.glob('../manager-runtime/{src,vendor,public}/**/*',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
import setup from '../manager-runtime/setup.php?raw';
import mail from '../manager-runtime/mail.example.php?raw';
import license from '../LICENSE?raw';

export async function generateManager(project:SiteProject,selected:ReadonlySet<string>){
  const access=accessConfig(project);const allowed=new Set(analyzeSite(project).filter(f=>selected.has(f.id)&&!(access.enabled&&access.pages.includes(f.page))).map(f=>f.id));
  const schema=await managerSchema(project,allowed);
  const suffix=Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('');
  const route=`manage-${suffix}`;
  const files:Record<string,string>={};
  for(const[path,text]of Object.entries(publicFiles(project)))files[`public/${path}`]=text;
  for(const[path,text]of Object.entries(runtime)){
    const relative=path.replace('../manager-runtime/','');
    if(relative.startsWith('public/'))files[`public/${route}/${relative.slice(7)}`]=text;
    else files[`private/runtime/${relative}`]=text;
  }
  files[`public/${route}/qrcode.js`]=runtime['../manager-runtime/vendor/qrcode.js'];
  files[`public/${route}/index.php`]=`<?php\ndeclare(strict_types=1);\nrequire_once dirname(__DIR__, 2) . '/private/runtime/src/Controller.php';\nWebbit\\Manager\\Controller::run(dirname(__DIR__, 2) . '/private', dirname(__DIR__));\n`;
  files['private/schema.json']=JSON.stringify(schema,null,2);
  files['private/mail.php']=mail;
  files['private/.htaccess']='Require all denied\n';
  files['private/web.config']='<?xml version="1.0"?><configuration><system.webServer><security><authorization><remove users="*" roles="" verbs=""/><add accessType="Deny" users="*"/></authorization></security></system.webServer></configuration>';
  files['setup.php']=setup;files['LICENSE']=license;
  files['README-MANAGER.md']=`# ${project.name} — Website Manager\n\nSet the server document root to public/. Keep private/ and setup.php outside the web root. PHP 8.2+ 64-bit, sodium and pdo_sqlite are required. Enable GD for image uploads and OpenSSL for optional SMTP. Configure upload_max_filesize to at least 5M and post_max_size to at least 6M. HTTPS is mandatory. Forwarded headers alone do not enable HTTPS: configure TLS correctly at the server. Give the PHP process write access to private/ and managed HTML pages. On Unix, set private/ to mode 0700; on Windows restrict its ACL to the server account and administrator.\n\nRun php setup.php from this package root on the server, then open https://YOUR-DOMAIN/${route}/ and enter the token. Enroll an authenticator, confirm the current code, and retain the one-use recovery codes. Login always requires password plus TOTP or a recovery code. No external authentication or email service is required.\n\nEdit private/mail.php to enable optional generic SMTP password reset and security notifications. The supplied Resend preset uses smtp.resend.com:465 with TLS. Credentials stay on the server; set WEBBIT_SMTP_PASSWORD or edit the private configuration. No email is sent unless enabled.\n\nManaged fields are chosen from this specific site. Publishing preserves unchanged field source, backs up pages, and rejects outside changes or stale browser forms. Regenerate the manager from Webbit if the page structure changes. Never delete a publish-pending.json journal until its recorded backup is restored. Back up private/ (including key.bin) securely with the website.\n\nThis Beta 1 manager currently supports selected page text, image references/alt text and search descriptions. Account controls change passwords, replace authenticators and rotate recovery codes, revoking other sessions. Optional email reset also requires TOTP. Image uploads accept PNG/JPEG/WebP up to 5 MB and 16 megapixels, re-encode with GD, and return a path for an image field. Collection/schema migration is not implemented; regenerate from the current website when its structure changes. Do not treat it as an audited production CMS.\n\nRuntime libraries retain their own licenses under private/runtime/vendor. Webbit source is MIT. No Vinny/Ravitz artwork is copied into this website.\n`;
  return {files:addMemberExport(files,project),route,schema};
}

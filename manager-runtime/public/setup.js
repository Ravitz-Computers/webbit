'use strict';
const target=document.getElementById('enrollment-qr');
if(target&&typeof qrcode==='function'){
  const code=qrcode(0,'M');code.addData(target.dataset.uri,'Byte');code.make();
  const image=document.createElement('img');image.src=code.createDataURL(5,8);image.alt='Scan with your authenticator app';target.append(image);
}

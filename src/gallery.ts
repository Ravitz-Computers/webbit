import {blockMarkup,escapeHtml} from './blocks';
export const galleryItems=[
 {id:'google-reviews',name:'Google Reviews',group:'Live integrations',description:'Live reviews via your PHP server and Google Places API'},
 {id:'text',name:'Text section',group:'Content',description:'Heading and editable paragraphs'},
 {id:'hero',name:'Hero / call to action',group:'Content',description:'Large headline and an action link'},
 {id:'columns',name:'Two columns',group:'Layout',description:'Responsive side-by-side content'},
 {id:'section',name:'Empty section',group:'Layout',description:'A container for other elements'},
 {id:'accordion',name:'FAQ accordion',group:'Interactive',description:'Expandable questions and answers'},
 {id:'tabs',name:'Tabbed content',group:'Interactive',description:'Switch between content panels'},
 {id:'slider',name:'Slide gallery',group:'Media',description:'Manual previous/next slides'},
 {id:'filter',name:'Searchable list',group:'Data',description:'Filter editable items instantly'},
 {id:'restaurant-menu',name:'Restaurant menu',group:'Food & hospitality',description:'Search dishes, descriptions and prices'},
 {id:'hours',name:'Opening hours',group:'Food & hospitality',description:'A clear weekly hours table'},
 {id:'pricing',name:'Pricing comparison',group:'Business',description:'Three plans with features and contact links'},
 {id:'testimonials',name:'Testimonials',group:'Business',description:'Customer quote cards'},
 {id:'schedule',name:'Event schedule',group:'Events',description:'Time, session and speaker rows'},
 {id:'navigation',name:'Page navigation',group:'Navigation',description:'Responsive links to site sections'},
 {id:'contact',name:'Contact card',group:'Business',description:'Email, phone and location placeholders'},
 {id:'image',name:'Image placeholder',group:'Media',description:'Select your own project image in the inspector'},
 {id:'video',name:'Video player',group:'Media',description:'Local video with native playback controls'},
 {id:'button',name:'Action button',group:'Navigation',description:'An editable link styled as a button'}
];
export function galleryMarkup(id:string){
 if(['text','hero','columns','section','accordion','tabs','slider','filter'].includes(id))return blockMarkup(id,galleryItems.find(i=>i.id===id)!.name,'First item\nSecond item\nThird item');
 if(id==='restaurant-menu')return `<section data-wb-block="Restaurant menu" data-wb-component="filter"><h2>Our menu</h2><label>Find a dish <input type="search" placeholder="Search dishes or ingredients"></label><p data-wb-status aria-live="polite"></p><div class="wb-data-cards">${[['Seasonal salad','Fresh leaves, herbs and house dressing','$12'],['House pasta','Seasonal vegetables and a rich tomato sauce','$19'],['Something sweet','Ask about today’s dessert','$8']].map(([name,description,price])=>`<article data-wb-row><h3>${name}</h3><p>${description}</p><p>${price}</p></article>`).join('')}</div><p>Please ask our team about ingredients and allergens.</p></section>`;
 if(id==='hours')return '<section data-wb-block="Opening hours"><h2>Opening hours</h2><table><tbody><tr><th scope="row">Monday–Friday</th><td>9 am – 6 pm</td></tr><tr><th scope="row">Saturday</th><td>10 am – 4 pm</td></tr><tr><th scope="row">Sunday</th><td>Closed</td></tr></tbody></table></section>';
 if(id==='pricing')return `<section data-wb-block="Pricing"><h2>Choose what works for you</h2><div class="wb-data-cards">${['Starter','Plus','Complete'].map((name,i)=>`<article data-wb-block="${name}"><h3>${name}</h3><p>$${[19,49,99][i]} / month</p><ul><li>Describe what is included.</li><li>Add another useful feature.</li></ul><a href="mailto:hello@example.com">Ask about ${name}</a></article>`).join('')}</div></section>`;
 if(id==='testimonials')return `<section data-wb-block="Testimonials"><h2>What people say</h2><div class="wb-data-cards">${['First','Second','Third'].map(n=>`<article><blockquote><p>Add a real customer quote with permission.</p></blockquote><p>${n} customer · Company</p></article>`).join('')}</div></section>`;
 if(id==='schedule')return '<section data-wb-block="Schedule"><h2>The schedule</h2><table><thead><tr><th scope="col">Time</th><th scope="col">Session</th></tr></thead><tbody><tr><td>09:00</td><td>Welcome and introductions</td></tr><tr><td>10:00</td><td>Opening conversation</td></tr><tr><td>13:00</td><td>Practical workshop</td></tr></tbody></table></section>';
 if(id==='navigation')return '<nav data-wb-block="Navigation" aria-label="Section navigation"><ul style="display:flex;flex-wrap:wrap;gap:24px;padding:20px;list-style:none"><li><a href="#about">About</a></li><li><a href="#services">Services</a></li><li><a href="#contact">Contact</a></li></ul></nav>';
 if(id==='contact')return '<section data-wb-block="Contact" id="contact"><h2>Let’s talk</h2><p>Replace these with your business details.</p><a href="mailto:hello@example.com">hello@example.com</a><p>Your address and telephone number</p></section>';
 if(id==='image')return '<figure data-wb-block="Image"><img src="assets/your-image.jpg" alt="Describe your image" style="max-width:100%;height:auto"><figcaption>Your caption</figcaption></figure>';
 if(id==='video')return '<section data-wb-block="Video"><h2>Watch the story</h2><video controls style="width:100%" src="assets/your-video.mp4"></video><p>Add a transcript or captions for accessibility.</p></section>';
 return `<div data-wb-block="Action"><a href="#contact" style="display:inline-block;padding:14px 24px;background:#59439c;color:white;border-radius:6px">${escapeHtml('Get in touch')}</a></div>`;
}

export type Part={type:'text'|'image'|'audio'|'video'|'delay';text:string;url:string;seconds:number};
export type Node={id:string;type:'message'|'carousel'|'wait'|'email'|'follow'|'tag';text:string;next:string;choices:{title:string;next:string}[];minutes:number;url:string;label:string;mediaType:''|'image'|'audio'|'video';mediaUrl:string;tag:string;parts?:Part[];seconds?:number;cards?:{title:string;subtitle:string;image:string;buttons:{title:string;url:string}[]}[];x:number;y:number};
export type MapFlow={start:string;nodes:Node[]};
export function validateMap(input:any):MapFlow{
 if(!input||!Array.isArray(input.nodes)||!input.nodes.length||input.nodes.length>30)throw Error('Use de 1 a 30 blocos no fluxo.');
 const nodes:Node[]=input.nodes.map((b:any)=>{
  const s=(k:string,max=600)=>{const v=b[k]??'';if(typeof v!=='string'||v.length>max)throw Error('Campo inválido no bloco: '+k);return v.trim();};
  const id=s('id',40),type=s('type',20),text=s('text'),next=s('next',40),url=s('url',500),mediaUrl=s('mediaUrl',500),mediaType=s('mediaType',10);
  if(!/^[a-zA-Z0-9_-]+$/.test(id)||!['message','carousel','wait','email','follow','tag'].includes(type))throw Error('Bloco inválido.');
  if(['message','email','follow'].includes(type)&&!text)throw Error('Preencha a mensagem de cada bloco.');
  const valid=(v:string)=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
  if(url&&!valid(url)||!['','image','audio','video'].includes(mediaType)||mediaType&&!valid(mediaUrl))throw Error('Use links HTTPS válidos nos blocos.');
  const choices=(b.choices??[]);if(!Array.isArray(choices)||choices.length>3)throw Error('Use até 3 opções por mensagem.');
  const parsed=choices.map((c:any)=>{if(typeof c.title!=='string'||!c.title.trim()||c.title.length>20||typeof c.next!=='string'||!c.next)throw Error('Preencha o texto e o destino das opções.');return {title:c.title.trim(),next:c.next};});
  if(parsed.length&&next)throw Error('Use os destinos das opções, sem uma segunda saída no mesmo bloco.');
  if(parsed.length&&(type!=='message'||url||mediaType))throw Error('Use opções de resposta em uma mensagem de texto sem link ou mídia.');
  const minutes=Number(b.minutes??60);if(type==='wait'&&(!Number.isInteger(minutes)||minutes<1||minutes>1380))throw Error('A espera deve ter de 1 a 1380 minutos.');
  const tag=s('tag',40);if(type==='tag'&&!tag)throw Error('Dê um nome à etiqueta.');
  if(mediaType&&url)throw Error('Separe mídia e botão de link em dois blocos.');
  let cards:Node['cards'];if(type==='carousel'){
   if(!Array.isArray(b.cards)||b.cards.length<1||b.cards.length>10)throw Error('O catálogo precisa de 1 a 10 itens.');
   cards=b.cards.map((c:any)=>{if(typeof c.title!=='string'||!c.title.trim()||c.title.length>80||typeof c.subtitle!=='string'||c.subtitle.length>80||!valid(c.image)||!Array.isArray(c.buttons)||c.buttons.length>3)throw Error('Confira título, descrição, imagem HTTPS e até 3 botões de cada item.');
    const buttons=c.buttons.map((v:any)=>{if(typeof v.title!=='string'||!v.title.trim()||v.title.length>20||!valid(v.url))throw Error('Confira os botões do catálogo.');return {title:v.title.trim(),url:v.url};});return {title:c.title.trim(),subtitle:c.subtitle,image:c.image,buttons};});
  }
  let parts:Part[]=[];if(b.parts){if(!Array.isArray(b.parts)||(b.parts.length&&type!=='message')||b.parts.length>12)throw Error('Use até 12 conteúdos adicionais por mensagem.');parts=b.parts.map((p:any)=>{if(!['text','image','audio','video','delay'].includes(p.type))throw Error('Conteúdo inválido.');const text=typeof p.text==='string'?p.text.trim():'',url=typeof p.url==='string'?p.url:'';const seconds=Number(p.seconds||3);if(p.type==='text'&&(!text||text.length>600)||['image','audio','video'].includes(p.type)&&!valid(url)||p.type==='delay'&&(!Number.isInteger(seconds)||seconds<1||seconds>10))throw Error('Confira os conteúdos; pausas curtas devem ter entre 1 e 10 segundos.');return {type:p.type,text,url,seconds};});}
  return {parts,cards,id,type:type as Node['type'],text,next,choices:parsed,minutes,url,label:s('label',20)||'Abrir link',mediaType:mediaType as Node['mediaType'],mediaUrl,tag,x:Math.max(0,Math.min(4000,Number(b.x)||0)),y:Math.max(0,Math.min(4000,Number(b.y)||0))};
 });
 const ids=new Set(nodes.map(n=>n.id));if(ids.size!==nodes.length||!ids.has(input.start))throw Error('Escolha um bloco inicial válido.');
 const visiting=new Set<string>(),seen=new Set<string>();function visit(id:string){if(!id)return;if(!ids.has(id))throw Error('Há uma conexão apontando para um bloco removido.');if(visiting.has(id))throw Error('O fluxo não pode voltar a um bloco anterior.');if(seen.has(id))return;visiting.add(id);const n=nodes.find(n=>n.id===id)!;visit(n.next);n.choices.forEach(c=>visit(c.next));visiting.delete(id);seen.add(id);}visit(input.start);
 if(seen.size!==nodes.length)throw Error('Conecte todos os blocos ao início do fluxo.');return {start:input.start,nodes};
}

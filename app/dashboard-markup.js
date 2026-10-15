import {readFileSync} from 'node:fs';
import path from 'node:path';

export function dashboardMarkup(){
  const document=readFileSync(path.join(process.cwd(),'dashboard.html'),'utf8');
  const markup=document.match(/<body>([\s\S]*?)<script type="module" src="\/app\.js"><\/script><\/body>/)?.[1];
  if(!markup)throw Error('Dashboard markup was not found');
  return markup;
}

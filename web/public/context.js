export const demoMode=location.pathname==='/demo'||new URLSearchParams(location.search).get('demo')==='1';
export const apiRoot=demoMode?'/api/demo/':'/api/';
export const workspaceUrl=demoMode?'/demo':'/';
export const pageUrl=path=>demoMode?path+(path.includes('?')?'&':'?')+'demo=1':path;

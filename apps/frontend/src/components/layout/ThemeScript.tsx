const SCRIPT = `(function(){try{var s=localStorage.getItem('eagle-eyes:theme');var m=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';var t=s==='light'||s==='dark'?s:m;var r=document.documentElement;if(t==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');}r.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}

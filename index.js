const Koa = require("koa");
const fs = require("fs");
const path = require("path");
const compilerSfc = require("@vue/compiler-sfc")
const compilerDom = require("@vue/compiler-dom")
const app = new Koa();
app.use(async ctx => {
    const { url, query } = ctx.request
    if(url==='/'){
        ctx.type='text/html'
        let content = fs.readFileSync('./index.html','utf-8')
        // 入口文件 加入环境变量
        content = content.replace(
            "<script",
            `
        <script>
            window.process = {env: { NODE_ENV: 'dev' }}
        </script>
        <script
        `
        );
        ctx.body=content
    }else if(url.endsWith('.js')){
        // es6模块化支持
        const p = path.resolve(__dirname,url.slice(1))
        const content = fs.readFileSync(p,'utf-8')
        ctx.type='application/javascript'
        // 第三方库支持
        ctx.body=rewriteImport(content)
    }else if(url.startsWith('/@modules')){
        // vite是通过es-module-lexer来重写模块加载路径，这里只是简单实现
        // 找到对应的第三方库
        // 需要找到对应库的package.json的module属性
        const prefix=path.resolve(__dirname,'node_modules',url.replace('/@modules/',""))
        // console.log("prefix",prefix);
        const module = require(path.resolve(prefix+'/package.json')).module
        // console.log("module",module);
        const ret =fs.readFileSync(path.resolve(prefix,module),'utf-8')
        ctx.type='application/javascript'
        ctx.body=rewriteImport(ret)
    }else if(url.indexOf('.vue')>-1){
        // sfc请求
        // 因为分两步完成所以需要获取下query参数
        const p = path.join(__dirname,url.split("?")[0])
        const ret = compilerSfc.parse(fs.readFileSync(p,'utf-8'))
        // console.log("ret:",ret);
        // 读取对应文件，解析为js
        if(!query.type){
            // 获取js部分内容
            let scriptCont = ret.descriptor.script.content
            // 替换默认导出，改成一个常量，方便后续修改（render）
            scriptCont=scriptCont.replace('export default','const __script=')
            ctx.type='application/javascript'
            ctx.body=`
            ${rewriteImport(scriptCont)}
            // 解析template，会再次发送一次请求
            import {render as __render} from '${url}?type=template'
            __script.render = __render
            export default __script
        `
        }else if(query.type==='template'){
           const telp = ret.descriptor.template.content 
            // 编译为render
           const render = compilerDom.compile(telp,{mode:"module"}).code
           ctx.type='application/javascript'
           ctx.body=rewriteImport(render)
        }
    }else if(url.endsWith('.css')){
        // css文件支持
        const p = path.resolve(__dirname,url.slice(1))
        let file = fs.readFileSync(p,'utf-8')
        const content = `
            const css = '${file.replace(/\s|\n/g,"")}'
            let style = document.createElement('style')
            style.setAttribute('type', 'text/css')
            style.innerHTML = css
            document.head.appendChild(style)
            export default css;
        `;
        ctx.type='application/javascript'
        ctx.body=rewriteImport(content)
    }
    // 裸模块地址重写
    function rewriteImport(content){
        return content.replace(/ from ['"](.*)['"]/g,function(s0,s1){
            if(s1.startsWith("./")||s1.startsWith("/")||s1.startsWith("../")){
                return s0
            }else{
                return `from '/@modules/${s1}'`
            }
        })
    }
})
app.listen(4000,()=>{
    console.log('启动成功端口4000');
})
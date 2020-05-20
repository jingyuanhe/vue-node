const Koa = require('koa')
const Router = require('koa-router');
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const cors = require('koa2-cors'); // 解决跨域的中间件 koa2-cors
const session = require('koa-session');
const index = require('./routes/goods')
const users = require('./routes/users')
const router = new Router();
// 导入数据库连接文件
const { connect } = require('./utils/connect');
// 导入初始化数据文件
const initDataService = require('./service/initData');
const goods = require('./routes/goods');
// error handler
onerror(app)
app.keys = [ 'session secret' ]; // 设置签名的 Cookie 密钥
// session 配置
const CONFIG = {
  key: 'sessionId',
  maxAge: 60000, // cookie 的过期时间 60000ms => 60s => 1min
  overwrite: true, // 是否可以 overwrite (默认 default true)
  httpOnly: true, // true 表示只有服务器端可以获取 cookie
  signed: true, // 默认 签名
  rolling: false, // 在每次请求时强行设置 cookie，这将重置 cookie 过期时间（默认：false）
  renew: false, // 在每次请求时强行设置 session，这将重置 session 过期时间（默认：false）
};
app.use(session(CONFIG, app));
app.use(cors({
  origin: function(ctx) {
    return ctx.header.origin
  }, // 允许发来请求的域名
  allowMethods: [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS' ], // 设置所允许的 HTTP请求方法
  credentials: true, // 标示该响应是合法的
}));
// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'ejs'
}));
// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})
app.use(async (ctx, next) => {
  const url = ctx.request.url;
  // 主要执行初始化数据导入数据库 | 访问 localhost:3000 执行数据导入任务
  if (url == '/') ctx.body = await initDataService.index();
  
  await next();
});
router.use('/api/goods', goods.routes()); // 商品相关
// routes
// 加载路由中间件
app.use(router.routes())
   .use(router.allowedMethods());
// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});
// 立即执行函数
(async () => {
  await connect(); // 执行连接数据库任务
})();
module.exports = app

// 常见的前端安全攻击
// xxs跨域请求攻击 注入脚本 获取信息 预防：替换特殊字符 如<变为&lt; >变为&gt; 这样<script>就变成了&lt;script&gt;这样就不会执行脚本了
// xsrf跨域请求伪造 预防：post请求 增加验证
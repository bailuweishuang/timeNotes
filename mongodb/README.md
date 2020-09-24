## mongod 的安装

- 安装教程可以按照 https://www.runoob.com/mongodb/mongodb-window-install.html
- https://www.cnblogs.com/zhoulifeng/p/9429597.html

- 启动：mongod

### 连接数据库

- 控制台输入 mongo

### 断开链接

- 控制台输入 exit

* show dbs 查看数据库列表

* db 查看当前的数据库

* use 数据库名称 （没有就会创建）

+ db.集合名.insert() 添加数据 

- show collections 查看当前集合

- db.集合名.find() 查看集合内容

### 在node 中如何操作MongoDB

+ 1. 使用官方的MongoDB包 node-mongodb-native

+ 2. 使用三方包 mongose http://www.mongoosejs.net/docs/index.html

 
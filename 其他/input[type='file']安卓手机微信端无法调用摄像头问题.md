## input[type='file']安卓手机微信端无法调用摄像头问题

- 使用 input type=file 标签进行文件上传时，在安卓手机中的微信浏览器中不能调起相机，但是在苹果手机中的微信浏览器中可以调用相机。解决办法：

* `<input type="file" name="upload" accept="image/png,image/jpeg,image/gif" capture="camera">`
* accept 属性：调用相册功能(ios 也可以直接调用相机)
* capture 属性：可以保证安卓手机调用相机功能。
* 注意：如果加了这条属性，会导致 ios 手机直接调用相机而无法选择相册中的文件
* 解决方法：
* 判断设备类型，动态添加 capture 属性(我使用 Zepto 判断)：
* `var plateform = Zepto.device.os; if(plateform == "android"){ $("selector").find("input[type='file']").attr("capture","camera"); }else if(plateform=="ios"){ $("selector").find("input      [type='file']").removeAttr("capture"); }`

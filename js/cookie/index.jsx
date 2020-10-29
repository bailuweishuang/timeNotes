cookie

localStorage

sessionStorage

// https://blog.csdn.net/justlpf/article/details/82662365

const p = new Promise((resolve, reject) => {
  [1,2,4].map((item) => {
    try {
      resolve(item)
    }catch(e) {
      reject('123')
    }
  })
})
p.then((res) => {
  console.log(res)
})
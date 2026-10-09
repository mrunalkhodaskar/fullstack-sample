function debounce(callback,delay=100){
    let timer;

    return(...args)=>
    {
        clearTimeout(timer);
        timer=setTimeout(()=>callback(...args),delay);           
    }
}

const searchLater = debounce((eq)=>{
    console.log("Searcing for :",eq);
},300);

searchLater("hello");


function debounce(callback,delay=100{
    let timer;

    return (...args)=>{
        clearTimeout(timer);
        timer=setTime
    }
})
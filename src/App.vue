<template>
    <div>
        我是单文件组件
    </div>
    <div>
        count:{{count}}
    </div>
    <button @click="add">+1</button>
</template>
<script>
import {ref} from "vue"
export default {
    setup(){
        const count = ref(1)
        function add(){
            count.value++
        }
        return {count,add}
    }
}
</script>
<style>

</style>
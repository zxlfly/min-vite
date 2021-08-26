import {createApp, h} from 'vue'
import Comp from "./App.vue"
import "./index.css"
const App = {
    render() {
        return h('div',null, String('第三方库的支持'))
    }
}
createApp(App).mount('#app2')
createApp(Comp).mount('#app')

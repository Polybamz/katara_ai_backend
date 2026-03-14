// import { db } from "../../config/firebase.js";

const subSlan = {
    free: { price: 0, apps: 1, credits: 10, currency: 'USD' },
    basic: { price: 10, apps: 3, credits: 50, currency: 'USD' },
    pro: { price: 20, apps: 10, credits: 100, currency: 'USD' },
    premium: { price: 50, apps: 50, credits: 1000, currency: 'USD' }
}


const validateInput = (plan, id) => {
    let list = ['free', 'pro', 'basic', 'premium']   
        if (list.includes(plan) && id != undefined) {       
            return {value: plan, error: null}
        } else {
            const message = id == undefined && list.includes(plan) ?
                'Id is required' :
                list.includes(plan) == false && id != undefined ? `${plan} is not a plan` :
                    'ID required and ' + `"${plan}" is not a plan`
            return {value: null, error: message}
        }
   
}

class SubsService {
    static createSubscription = async (plan, uid) => {

        try {
          const {value, error} = validateInput(plan, uid)
          if(error) throw error
            const planInfo = subSlan[value];
            console.log(planInfo)
            console.log(uid)
        } catch (er) {
            console.log('Error: ', er)
        }

    }
}

SubsService.createSubscription('free', 'gfhgdhsgfhdsjhd')
// SubsService.createSubscription()
// SubsService.createSubscription('pr', 'hygiufdkjhkgdj')
// SubsService.createSubscription('premium')
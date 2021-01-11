---
title: "Vue vs React Part I (Vue's prolific simplicity)"
date: 2021-01-10T13:48:52+01:00
draft: true
author: PI-Victor
tags:
- vue
- frontend
- javascript
- vuex
- vue-router
---

Yep, it's the beginning of 2021 and it's one of those posts! I decided there aren't enough
of them on the internet and thought i might indulge in writing one :laughing:.  

This comes from my perspective as a beginner in both frameworks and i will be talking
about vue 2 not vue 3, i haven't rolled out, ported or even read anything on vue 3 yet.  

Initially i wanted to write a single post, but there's a lot of example code to cover, so
i decided to split it in three instead.  

See also:

* [The problem with React Part 2](/2021/01/vue-vs-react-part-ii-my-problem-with-react/)
* [Vue and React Comparison Part 3]()

Let me explain the needs that have surfaced while building fullstack apps in my current job:

* simple frontend, needs to be good enough
* some user data persistence is needed, but should be stored in the browser
* nothing fancy for CSS
* link sharing not necessary, so the standard [hash mode](https://router.vuejs.org/guide/essentials/history-mode.html#html5-history-mode)
does the job
* gRPC communication with the backend
* pick something simple enough that anyone, even those who hate frontend, are capable to quickly
make a change

## Vue

Vue was the right pick, not because it's superior to React, but because for this use case it
was the right tool. It fits all of the points above. We used Vue (vue, vue-router and vuex) for
creating UIs that serve everyday internal company purposes. 

Create the app with [vue-cli](https://cli.vuejs.org/) and you already have pretty much everything
you need.  
For routing, vue-router is straight forward and requires very little configuration.

```js
import Vue from "vue";
import VueRouter from "vue-router";
// we'll get to the store in an example below
import store from "@/store";

Vue.use(VueRouter);

// use a login guard and check if the user is authenticated
// the 'auth/loggedIn' part is covered in the store code
// example below.
const loginGuard = (_, __, next) =>
  store.getters["auth/loggedIn"] ? next() : next("/login");

const routes = [
    {
        path: "/myRouter",
        name: "myComponent",
        beforeEnter: loginGuard,
        // lazy load component for the route. this is for bigger apps and not
        // necessary in smaller apps.
        component: () => import(/* webpackChunkName: "myComponent" */ "@/views/myComponent.vue"),
        // pass metadata. in this example we also want to render the navbar, 
        // since this is a route where the component needs to have the navbar rendered.
        meta: { navbar: true },
    }
]
```

Of course this is a very straight forward example of a simple application, but this does get the
job done for our use case.

*Note:This step is optional if managing state at the component level is not enough for your
application.*

For (global) state management, you can use vuex. Configuring a vuex instance is also easy and
straight forward. But what about our requirement of storing some data in the browser? Well,
initially i ended up using cookies, but it turned out in the long run, this was not necessary and
 ended up using the browser localStorage thanks to
[vuex-persistedstate](https://github.com/robinvdvleuten/vuex-persistedstate).

For configuring the store, we will break this into multiple examples:

Plugin config `plugins/persistence.js`

```js
import createPersistedState from "vuex-persistedstate";

// the lib defaults to using the localStorage API 
// whenever no config is passed
// this can also be configure to persist state in
// cookies, refer to the docs for that.
export default createPersistedState({});
```

auth state module `store/auth.js`

```js
const state = { username: null };

const getters = {
    // returns whether a user has been added to the store or not.
    loggedIn: state => state.username !== null,
};

const actions = {
    // this can be used from a login component such as a login form
    // to set the username 
    logIn: ({commit}, payload) => commit("setUsername", payload)
};

const mutations = {
    // the vuex store, as with other stores, splits its functionality
    // in multiple ways, mutations ensure synchronous mutation of the
    // state tree.
    setUsername(state, username) {
        state.username = username;
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations,
}
```

Store config `store/index.js`

```js
import Vue from "vue";
import Vuex from "vuex";

import auth from "@/store/auth";

import persistence "@/plugins/persistence";

Vue.use(Vuex);

export default new Vuex.Store({
    modules: { auth },
    plugins: [persistence],
})
```

With these very basic building blocks in place you can now manage routes, state and
persist the state into the browser's localStorage.  

But what about async data fetching or anything of that sort?  

It's simple, just stick it into an action:

```js
const state = { items: null, error: null };

const getters = {
    items: state => state.items,
    error: state => state.error,
};

const actions = {
    async getItems: ({ commit }) => {
        try {
            const { data } = await grpc.getItems();
            commit('setItems', data);
        } catch(error) {
            commit('setError', error);
        }
    },
};

const mutations = {
    setItems(state, payload) {
        state.items = payload.items;
    },
    setError(state, err) {
        state.error = err;
    },
};
```

Now your components can take advantage of state and update.

## Conclusion

My basic knowledge of frontend comes mostly from pair programming with my colleague
[Pablo](https://github.com/escodebar).  
He said and interesting thing, that Vue is about conventions and i believe this plays
a major role when trying to learn a new technology.  

If a framework defines conventions for how to structure your application, it makes it
considerably easier for you to code, thus making the learning curve small. Conventions
are important to beginners, they take away some of the headache of trying to account
for all the variables that come into play when writing frontend apps.  

In the next post, i will be talking about React, and that's where i think this stands
true the best.

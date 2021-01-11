---
title: "Vue vs React part II (My problem with React)"
date: "2021-01-10T18:04:58+01:00"
author: "PI-Victor"
draft: true
tags:
- frontend
- react
- react-redux
- react-thunk
--- 

Ever since rolling out a couple of applications at work and getting the hang of
working with frontend technologies (and also loving it, btw) i got more and more
curios about React. I knew, off-the-bat, that React's learning curve is steep
however, that turned out to not be the case. React is not necessarily complicated
to learn, but there is a lot less convention and a lot more boiler plate code.

I remember reading a blogpost about this where someone was saying that Vue is a
framework while React is a library and i can't agree more with that assessment.

Vuex for example is designed to be
[aware that it is a Vue data component](https://vuejs.org/v2/guide/state-management.html#Information-for-React-Developers), as opposed to Redux, that is generic and can be used in other frameworks.  
In order to use redux within react, you need react-redux or to write your own
implementation. This is where the argument that React is a library stands true,
react components know less about each other and it's really up to you to write
the glue that holds them together. I think this stems from a need of flexibility
when building larger, more complex apps.

## Conventions

In the previous post, i've written about conventions and how vue expects you to
write things a certain way, which i'd argue is great for beginners. However in
React there are less conventions. The best way to see this is by creating a new
app with [create-react-app](https://github.com/facebook/create-react-app).

```bash
tree src
src
├── App.css
├── App.js
├── App.test.js
├── index.css
├── index.js
├── logo.svg
├── reportWebVitals.js
└── setupTests.js
```

From the [docs](https://reactjs.org/docs/faq-structure.html):

> React doesn’t have opinions on how you put files into folders.
> That said there are a few common approaches popular in the ecosystem you may
> want to consider...

I know, neither does Vue. However the contrast is a lot starker once you create
a new project with either CLI. I will compare this with Vue in the next post.  
I also know this is a nit, and you are allowed to structure your project however
you see fit.

In the previous post, we've talked about how to get basic building blocks to do
something really simple, really fast. And for that matter, Vue did the trick.
We could try to do the same in react, but... we need a lot more explanation, so
here goes nothing.

For routing, you can use react-router-dom. Configuring this is achieved by

---
title: "gRPC Web"
date: 2021-01-03T03:06:04+01:00
draft: false
author: "PI-Victor"
tags:
- grpc
- protobuf
- typescript
- grpc-web
- frontend
- react
---

In this posts we will explore how to make a frontend, written in
React, talk to a gRPC service.

## gRPC and the web

Browsers [can't talk to gRPC services natively](https://grpc.io/blog/state-of-grpc-web/#the-grpc-web-spec)
so the solution came in the form of a proxy that could translate the frontend http requests
made by the browser to gRPC calls that the backend gRPC service could understand.  
These solutions are differently implemented in both libraries that emerged to tackle this
problem.

## Google gRPC-web

[This library](https://github.com/grpc/grpc-web) uses [XHR](https://en.wikipedia.org/wiki/XMLHttpRequest) transport only so that
 it guarantees backwards compatibility with older browsers. It also provides no proxy
 out of the bag to translate the frontend requests to native gRPC calls, in order to use this,
 you need something like Envoy between the frontend and your gRPC service.  
 Using this is pretty straight forward:

* Generate the commonjs (or experimental typescript) client stubs, based on your proto file set
* Point the frontend client instance created using the above generated stubs towards the Envoy proxy
* Configure the Envoy proxy to point to your gRPC service instance
* profit!

## Improbable gRPC-web

If you are in Go land, this is probably the best library to use since it has a
[Go library that provides hassle free translation of browser requests](https://github.com/improbable-eng/grpc-web/tree/master/go/grpcweb), that you can use directly in your Go code.
If you are not in Go land, that's okay, they also provide a
[proxy binary](https://github.com/improbable-eng/grpc-web/tree/master/go/grpcwebproxy) that can do exactly what the library does, this can make it easier to avoid heavier solutions such as Envoy.
Using the improbable library has the following steps:

* Generate the stubs using commonjs (optionally the typescript definitions using the [ts-protoc-gen](https://github.com/improbable-eng/ts-protoc-gen) plugin)
* Point your frontend client instance directly at your gRPC service
* In your Go code wrap the gRPC server with the translation capable library and pass it to a http server instance:

```Go
import (
    "github.com/improbable-eng/grpc-web/go/grpcweb"
    "github.com/gorilla/mux"
    "google.golang.org/grpc"
)

grpcServer := grpc.NewServer()
wrappedGrpcServer := grpcweb.WrapServer(grpcServer)
router := mux.NewRouter()
// stripPrefix is a function that will strip the '/grpc' from the url path so that
// the incoming requests is handled properly.
router.PathPrefix("/grpc").Handler(stripPrefix("/grpc", wrappedGrpcServer))
httpServer := &http.Server{
    Addr:         address,
    Handler:      router,
}
if err := httpServer.ListenAndServe(); err != nil {
    if err != http.ErrServerClosed {
        panic(err)
    }
}
```

## Generating frontend client stubs

In order to generate the client stubs to use within your chosen library you need the protoc
plugin. [Download and install](https://github.com/grpc/grpc-web#code-generator-plugin) the
protoc-gen-grpc-web plugin and generate the stubs:

```bash
$ protoc --proto_path=my/relative/path \
    --js_out=import_style=commonjs:path/to/frontend/api \
    --grpc-web_out=import_style=commonjs,mode=grpcwebtext:path/to/frontend/api \
    my-protoset.proto
```

This will generate two files, `myservice_pb.js` and `myservice_grpc_web_pb.js`. The first
one contains the protobuf messages translated to javascript, and another that basically
has the grpc-web service implementation that allows you to create a client instance and
send requests to the backend.

in your `src/v1/api/index.js`

```js
import { MyServicePromiseClient } from './v1/myservice_grpc_web_pb.js';
import {
    ListMessageRequest,
    MyMessageMetadata,
} from './v1/myservice_pb.js'

// create a new client with the ip address of the gRPC service
// this can be either the Envoy proxy or your native gRPC service 
// wrapped in the improbable proxy library.
const client = new MyServicePromiseClient('http://127.0.0.1:8090')

const ListSomething = async => {
    let listMessageRequest = new ListMessageRequest();
    let metadata = new MyMessageMetadata();
    metadata.setMetadataTimestamp(Date.now())
    listMessageRequest.setMetadata(metadata)
    const resp = await client.listMessage(listMessageRequest)
    return resp.toObject()
}

export { ListSomething };
```

for react: in your `src/components/mycomponent/component.js`

```js
import React, { useEffect } from 'react';

import { ListSomething } from '../api';

export default function MyComponent() {
    const [list, setList] = React.useState([]);
    const [err, setError] = React.useState(null);
    
    useEffect(() => {
        async function listSomething() {
            try {
                const resp = await ListSomething();
                setList(resp.myList);
            } catch(err) {
                setError(err)
            }
        }
        listSomething()
    }, [])
}
```

The above simply does a request to the gRPC server to fetch a list and store
the result in the component's state. This uses the API we defined above to
create the request and attach metadata to it. You can also pass params to
the API and set fields and other metadata, such as auth tokens, labels et all
 based on your needs.


## Conclusion

I hope this post has cleared up some basics about building frontend applications
that can talk to gRPC services. The grpc-web client can do both unary calls but
also streaming. For the different options (server side streaming, client side
streaming, bi-directional) you have to consult the gRPC-web library documentation
to see which one is supported.

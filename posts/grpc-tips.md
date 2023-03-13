

Earlier this year i started to write a lot of gRPC services and after a while fiddling around, there
are things that are worth mentioning for the uninitiated.

### Design documentation

I found the [Google API design documentation](https://cloud.google.com/apis/design) useful for making you
adopt some standards for your APIs early on. You don't have to follow it word by word, but overall it
definitely has its use. From [mapping http methods to gRPC methods](https://cloud.google.com/apis/design/standard_methods)
to [naming conventions](https://cloud.google.com/apis/design/naming_convention) that help you design your
API intuitive for future growth.

### Exploring gRPC APIs at runtime

You can explore gRPC APIs at runtime by using [grpcurl](https://github.com/fullstorydev/grpcurl).
grpcurl is not only able to behave like regular curl but it can also be used to explore your API, this can
be achieved in two ways:

* enable reflection in your code
* passing the protoset source file as a parameter
* passing the protoset compiled bin file

#### Enabling and exploring with reflection

Given the following protobuf API:

```proto
service StorageApiService {
    rpc GetBuckets(GetBucketsRequest) returns (GetBucketsResponse) {}
    message GetBucketRequest {}
    message GetBucketsResponse {
        repeated Bucket buckets = 1;
    }
}
```

Import reflection and register the gRPC server instance.

```go
import (
    "net"
    
    "google.golang.org/grpc/reflection"
    "google.golang.org/grpc"
)

func main() {
    ...
    lis, err := net.Listen("tcp", "0.0.0.0:8099")
    if err != nil {
        panic(err)
    }
    defer lis.Close()
    var opts []grpc.ServerOption
    grpcServer := grpc.NewServer(opts...)
    // register your gRPC implementation first
    pbv1.RegisterStorageApiService(grpcServer, newServer())
    // enable reflection 
    reflection.Register(grpcServer)
    grpcServer.Serve(list)
    ...
}
```

Assuming that the server is running on `tcp://localhost:8099`,
you can now explore the API by using `list` and `describe`.

```bash
$ grpcurl --plaintext localhost:8099 list
codeflavor.grpcrest.proto.v1.StorageApiService
grpc.reflection.v1alpha.ServerReflection

$ grpcurl --plaintext localhost:8099 describe codeflavor.grpcrest.proto.v1.StorageApiService
codeflavor.grpcrest.proto.v1.StorageApiService is a service:
service StorageApiService {
  rpc GetBuckets ( .codeflavor.grpcrest.proto.v1.GetBucketsRequest ) returns ( .codeflavor.grpcrest.proto.v1.GetBucketsResponse ) {}
}

$ grpcurl --plaintext localhost:8099 describe codeflavor.grpcrest.proto.v1.StorageApiService.GetBuckets
codeflavor.grpcrest.proto.v1.StorageApiService.GetBuckets is a method:
rpc GetBuckets ( .codeflavor.grpcrest.proto.v1.GetBucketsRequest ) returns ( .codeflavor.grpcrest.proto.v1.GetBucketsResponse ) {}

$ grpcurl --plaintext localhost:8099 codeflavor.grpcrest.proto.v1.StorageApiService.GetBuckets
{
  "buckets": [
    {
      "name": "bucket1"
    },
    {
      "name": "bucket2"
    }
  ]
}
```

#### Exploring using the protoset source file

In certain situations you might not want to make the API publicly available, especially on the internet.
This type of information can become a security concern if it is made publicly available.  

Without reflection enabled, we're unable to browse the API like we did above.

```bash
$ grpcurl --plaintext localhost:8099 list
Failed to list services: server does not support the reflection API
```

However we can pass the protoset source file:

**NOTE**: If you import special proto files, like i do below, the paths need to be passed to `grpcurl`. In
my example i use the `grpc-gateway` annotations file (which i'll write a post about soon, ignore the
`option` entry for now).

```bash
grpcurl --plaintext -import-path internal -import-path /usr/local/include/ -proto proto/grpcrest.proto localhost:8099 list
codeflavor.grpcrest.proto.v1.StorageApiService

grpcurl --plaintext -import-path internal -import-path /usr/local/include -proto proto/grpcrest.proto localhost:8099 describe
codeflavor.grpcrest.proto.v1.StorageApiService is a service:
service StorageApiService {
  rpc CreateBucket ( .codeflavor.grpcrest.proto.v1.CreateBucketRequest ) returns ( .codeflavor.grpcrest.proto.v1.CreateBucketResponse ) {
    option (.google.api.http) = { post:"/v1/buckets" body:"*" response_body:"bucket"  };
  }
  rpc GetBuckets ( .codeflavor.grpcrest.proto.v1.GetBucketsRequest ) returns ( .codeflavor.grpcrest.proto.v1.GetBucketsResponse ) {
    option (.google.api.http) = { get:"/v1/buckets"  };
  }
  rpc GetObject ( .codeflavor.grpcrest.proto.v1.GetObjectRequest ) returns ( .codeflavor.grpcrest.proto.v1.GetObjectResponse ) {
    option (.google.api.http) = { get:"/v1/buckets/{bucket}/objects/*"  };
  }
  rpc GetObjects ( .codeflavor.grpcrest.proto.v1.GetObjectsRequest ) returns ( .codeflavor.grpcrest.proto.v1.GetObjectsResponse ) {
    option (.google.api.http) = { get:"/v1/buckets/{bucket}/objects"  };
  }
  rpc GetResult ( .codeflavor.grpcrest.proto.v1.GetResultRequest ) returns ( stream .codeflavor.grpcrest.proto.v1.GetResultResponse ) {
    option (.google.api.http) = { get:"/v1/results"  };
  }
}
```

#### Exploring using the compiled protoset bin file

Alternatively you can pass the compiled protoset binary file.

Compile the protoset bin file:

```bash
$ protoc --proto_path=. \
    --descriptor_set_out=StorageApiService.protoset \
    --include_imports internal/proto/grpcrest.proto
```

Use the protoset bin file to describe the API

```bash
$ grpcurl --plaintext  -protoset StorageApiService.protoset  localhost:8099 describe
codeflavor.grpcrest.proto.v1.StorageApiService is a service:
service StorageApiService {
  rpc CreateBucket ( .codeflavor.grpcrest.proto.v1.CreateBucketRequest ) returns ( .codeflavor.grpcrest.proto.v1.CreateBucketResponse ) {
    option (.google.api.http) = { post:"/v1/buckets" body:"*" response_body:"bucket"  };
  }
  rpc GetBuckets ( .codeflavor.grpcrest.proto.v1.GetBucketsRequest ) returns ( .codeflavor.grpcrest.proto.v1.GetBucketsResponse ) {
    option (.google.api.http) = { get:"/v1/buckets"  };
  }
  rpc GetObject ( .codeflavor.grpcrest.proto.v1.GetObjectRequest ) returns ( .codeflavor.grpcrest.proto.v1.GetObjectResponse ) {
    option (.google.api.http) = { get:"/v1/buckets/{bucket}/objects/*"  };
  }
  rpc GetObjects ( .codeflavor.grpcrest.proto.v1.GetObjectsRequest ) returns ( .codeflavor.grpcrest.proto.v1.GetObjectsResponse ) {
    option (.google.api.http) = { get:"/v1/buckets/{bucket}/objects"  };
  }
  rpc GetResult ( .codeflavor.grpcrest.proto.v1.GetResultRequest ) returns ( stream .codeflavor.grpcrest.proto.v1.GetResultResponse ) {
    option (.google.api.http) = { get:"/v1/results"  };
  }
}
```

#### Debugging

Exporting `GODEBUG=http2debug=2` locally, in the container or in the k8s pod where the gRPC server instance
is currently running is a godsend for troubleshooting problems with incoming requests and also checking if
your requests are actually hitting the server.  

From the CLI, as mentioned above:

```bash
grpcurl --plaintext  -protoset StorageApiService.protoset  localhost:8099 codeflavor.grpcrest.proto.v1.StorageApiService.GetBuckets
{
  "buckets": [
    {
      "name": "bucket1"
    },
    {
      "name": "bucket2"
    }
  ]
}
```

STDOUT of the gRPC server (alternatively this shows up in your container logs). Lines 12 is the exact request
 that that server received.

```bash
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: read HEADERS flags=END_HEADERS stream=1 len=93
2020/12/13 16:39:22 http2: decoded hpack field header field ":method" = "POST"
2020/12/13 16:39:22 http2: decoded hpack field header field ":scheme" = "http"
2020/12/13 16:39:22 http2: decoded hpack field header field ":path" = "/codeflavor.grpcrest.proto.v1.StorageApiService/GetBuckets"
2020/12/13 16:39:22 http2: decoded hpack field header field ":authority" = "localhost:8099"
2020/12/13 16:39:22 http2: decoded hpack field header field "content-type" = "application/grpc"
2020/12/13 16:39:22 http2: decoded hpack field header field "user-agent" = "grpc-go/1.30.0"
2020/12/13 16:39:22 http2: decoded hpack field header field "te" = "trailers"
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: read DATA flags=END_STREAM stream=1 len=5 data="\x00\x00\x00\x00\x00"
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: wrote WINDOW_UPDATE len=4 (conn) incr=5
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: wrote PING len=8 ping="\x02\x04\x10\x10\t\x0e\a\a"
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: read PING flags=ACK len=8 ping="\x02\x04\x10\x10\t\x0e\a\a"
&v1.GetBucketsRequest{state:impl.MessageState{NoUnkeyedLiterals:pragma.NoUnkeyedLiterals{}, DoNotCompare:pragma.DoNotCompare{}, DoNotCopy:pragma.DoNotCopy{}, atomicMessageInfo:(*impl.MessageInfo)(0xc0002b0138)}, sizeCache:0, unknownFields:[]uint8(nil), Name:""}
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: wrote HEADERS flags=END_HEADERS stream=1 len=14
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: wrote DATA stream=1 len=27 data="\x00\x00\x00\x00\x16\n\t\n\abucket1\n\t\n\abucket2"
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: wrote HEADERS flags=END_STREAM|END_HEADERS stream=1 len=24
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: read WINDOW_UPDATE len=4 (conn) incr=27
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: read PING len=8 ping="\x02\x04\x10\x10\t\x0e\a\a"
2020/12/13 16:39:22 http2: Framer 0xc0003341c0: wrote PING flags=ACK len=8 ping="\x02\x04\x10\x10\t\x0e\a\a"
```

### gRPC access over k8s NGINX ingress

To expose a gRPC service from kubernetes for company wide use there a few options.

#### LoadBalancer service type

If you're in a public cloud environment you can expose the service via the service type LoadBalancer and
you're pretty much done.

If you're in a private cloud and have no F5 Load balancer, you can use [metallb](https://metallb.universe.tf/)
and do the exact same thing as above.

#### NGINX k8s Ingress

**NOTE:** This example disregards more advanced ingresses and gateways such as [Istio](https://istio.io/latest/),
[Traekif](https://doc.traefik.io/traefik/user-guides/grpc/) or
[HAProxy](https://www.haproxy.com/products/haproxy-enterprise-kubernetes-ingress-controller/) and only addresses
a standard [NGINX ingress controller](https://www.nginx.com/products/nginx-ingress-controller/).

If none of these are viable options to you or you prefer that your gRPC service is exposed via a URL rather than
an IP address, then you can make the kubernetes ingress forward gRPC requests to the service by adding a simple
[annotation to your ingress](https://kubernetes.github.io/ingress-nginx/examples/grpc/).

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
  labels:
    backend-protocol: grpc
    environment: production
    project: myproject
  name: myingress
  namespace: mynamespace-prod
spec:
  rules:
  - host: mygrpcservice.k8s.example.com
    http:
      paths:
      - backend:
          serviceName: grpcservice
          servicePort: grpcport
```

The catch here is that this ingress should have `https`. If you do automatic https at the nginx controller level or
you have a `TLS` section in the ingress definition above, that is up to you. **gRPC over http doesn't work**.
Another thing to keep in mind is that your nginx ingress controller needs to be `v0.30` or above.  

```go
import (
    "google.golang.org/grpc"
    grpcCreds "google.golang.org/grpc/credentials"
)

func main() {
    // this is the (https) address exposed by the kubernetes ingress.
    apiAddress := "mygrpcservice.k8s.example.com:443"
    config := &tls.Config{
        // This is here only to make it work with self signed certs.
        InsecureSkipVerify: true,
        NextProtos:         []string{"h2"},
    }
    creds := grpcCreds.NewTLS(config)
    conn, err := grpc.Dial(
            apiAddress,
            grpc.WithTransportCredentials(creds),
    )
    if err != nil {
        panic(err)
    }
    defer conn.Close()
    //conn can now be used to dial to the gRPC server.
}
```

In conclusion, i think that these things would help anyone in their quest of building resilient and
intuitive APIs but also help developers to understand better how to explore, debug and troubleshoot
gRPC APIs.

In the next posts i will also discuss [grpc-web](https://github.com/grpc/grpc-web) for enabling a frontend
app to talk to a gRPC server, [grpc-gateway](https://github.com/grpc-ecosystem/grpc-gateway) for
transcoding REST API calls to gRPC calls and also documenting, through proto annotations, the REST API
endpoints with the [OpenAPIv2 spec](https://swagger.io/specification/v2/) and
[gRPC interceptors](https://github.com/grpc-ecosystem/go-grpc-middleware) as gRPC middleware.
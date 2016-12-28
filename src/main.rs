extern crate hyper;

use std::io::Read;

use hyper::*;
use hyper::header::Connection;

use std::env;


fn main() {
    // debug info
    // array of arguments
    let args: Vec<String> = env::args().collect();
    println!("My path is {}.", args[0]);
    println!("I got {:?} arguments: {:?}.", args.len() - 1, &args[1..]);
    println!("Welcome to Clusterio!");

    // query master for server details
    // Create a client.
    let mut client = Client::new();

    // Creating an outgoing request.
    let mut res = client.get("http://localhost:8080/inventory")
        // set a header
        .header(Connection::close())
        // let 'er go!
        .send().unwrap();

    // Read the Response.
    let mut body = String::new();
    res.read_to_string(&mut body).unwrap();
    println!("Response: {}", body);
}
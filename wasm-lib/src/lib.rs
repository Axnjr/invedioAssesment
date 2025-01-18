use wasm_bindgen::prelude::*;
use evalexpr::*;

#[wasm_bindgen]
pub fn evaluate_expression(expr: &str) -> Result<f64, JsValue> {
    eval(expr)
        .map_err(|e| JsValue::from_str(&format!("Error: {}", e)))
        .and_then(|v| match v {
            Value::Float(result) => Ok(result),
            Value::Int(result) => Ok(result as f64),
            _ => Err(JsValue::from_str("Error: Unexpected result type")),
        })
}

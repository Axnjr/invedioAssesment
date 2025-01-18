defmodule Router do
  use Plug.Router
  require Logger

  plug CORSPlug, origin: "*"

  # Plug setup
  plug :match
  plug Plug.Parsers,
    parsers: [:json, :multipart],
    pass: ["*/*"],
    json_decoder: Jason
  plug :dispatch

  # POST and GET route for generating shader code
  match "/generate_shader" do
    # Extract description from body or query parameters
    description =
      conn.body_params["description"] ||
        conn.query_params["description"]

    Dotenv.load()

    if description do
      Logger.info("Generating shader for description: #{description}")

      # Call the LLM API
      case call_llm(description) do
        {:ok, shader_code} ->
          Logger.info("Shader code generated successfully")
          send_resp(conn, 200, Jason.encode!(%{shader_code: shader_code}))

        {:error, reason} ->
          Logger.error("Error generating shader: #{reason}")
          send_resp(conn, 400, Jason.encode!(%{error: reason}))
      end
    else
      Logger.warn("Missing 'description' field in request")
      send_resp(conn, 400, Jason.encode!(%{error: "Missing 'description' field"}))
    end
  end

  # Catch-all route for undefined paths
  match _ do
    Logger.warn("Unmatched route: #{conn.method} #{conn.request_path}")
    send_resp(conn, 404, Jason.encode!(%{error: "Not Found"}))
  end

  defp call_llm(description) do
    url = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct/v1/chat/completions"

    api_key = System.get_env("API_KEY")

    headers = [
      {"Authorization", "Bearer #{api_key}"},
      {"Content-Type", "application/json"}
    ]

    body = Jason.encode!(%{
      "model" => "Qwen/Qwen2.5-Coder-32B-Instruct",
      "messages" => [
        %{
          "role" => "user",
          "content" => "Write valid WebGL shader code for the description: #{description}. Ensure it is complete and valid. Please provide only the code and nothing else."
        }
      ],
      "max_tokens" => 500,
      "stream" => false
    })

    options = [timeout: 30_000, recv_timeout: 30_000]

    case Finch.build(:post, url, headers, body) |> Finch.request(App.MyFinch, options) do
      {:ok, %Finch.Response{status: 200, body: response_body}} ->
        case Jason.decode(response_body) do
          {:ok, %{"choices" => [%{"message" => %{"content" => raw_text}}]}} ->
            # Check for valid content
            if raw_text != "" do
              {:ok, raw_text}
            else
              {:error, "No valid content returned from the model"}
            end

          {:ok, %{"choices" => [%{"finish_reason" => "length"}]}} ->
            {:error, "The response was incomplete, likely due to the token length limit."}

          {:error, _decode_error} ->
            {:error, "Failed to parse response from Hugging Face API"}
        end

      {:ok, %Finch.Response{status: status, body: error_body}} ->
        {:error, "Hugging Face API returned status #{status}: #{error_body}"}

      {:error, %Mint.TransportError{reason: reason}} ->
        # Format the timeout error explicitly
        {:error, "Request failed due to timeout: #{inspect(reason)}"}

      {:error, request_error} ->
        {:error, "Request failed: #{inspect(request_error)}"}
    end
  end
end


# curl 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct/v1/chat/completions' \
# -H 'Authorization: Bearer hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \
# -H 'Content-Type: application/json' \
# --data '{
#     "model": "Qwen/Qwen2.5-Coder-32B-Instruct",
#     "messages": [
# 		{
# 			"role": "user",
# 			"content": "What is the capital of France?"
# 		}
# 	],
#     "max_tokens": 500,
#     "stream": false
# }'

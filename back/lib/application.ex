defmodule App.Application do
  use Application

  require Logger

  def start(_type, _args) do
    children = [
      # Add Finch to the supervision tree
      {Finch, name: App.MyFinch},
      # Start the Plug.Cowboy server
      {Plug.Cowboy, scheme: :http, plug: Router, options: [port: port()]}
    ]

    Dotenv.load()

    Logger.info("Server running on port: #{port()}")
    Supervisor.start_link(children, strategy: :one_for_one, name: App.Supervisor)
  end

  # Retrieves the port from the application environment, defaulting to 8000
  defp port do
    Application.get_env(:app, :port, 8000)
  end
end

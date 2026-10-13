defmodule CampustreeWeb.ErrorJSONTest do
  use CampustreeWeb.ConnCase, async: true

  test "renders 404" do
    assert CampustreeWeb.ErrorJSON.render("404.json", %{}) == %{errors: %{detail: "Not Found"}}
  end

  test "renders 500" do
    assert CampustreeWeb.ErrorJSON.render("500.json", %{}) ==
             %{errors: %{detail: "Internal Server Error"}}
  end
end

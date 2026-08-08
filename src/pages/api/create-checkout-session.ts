import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log("Full Request Headers:", Object.fromEntries(request.headers.entries()));
    const body = await request.text();
    console.log("Raw body received:", body);
    console.log("Body length:", body.length);
    if (!body) {
      console.log("Request body is empty or null");
      return new Response(JSON.stringify({ error: "Missing request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const json = JSON.parse(body);
    console.log("json", json);
    const { amount } = json;
    console.log("amount", amount);
    // Validate amount: must be number, at least $1 (100 cents)
    if (typeof amount !== "number" || amount < 100) {
      return new Response(
        JSON.stringify({ error: "Invalid amount. Minimum donation is $1." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Donation to Vote Rutherford" },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${new URL(request.url).origin}/success`,
      cancel_url: `${new URL(request.url).origin}/donate`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

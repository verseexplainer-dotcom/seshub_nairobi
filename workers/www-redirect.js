const CANONICAL_ORIGIN = "https://sesicthub.co.ke";

export default {
  async fetch(request) {
    const target = new URL(request.url);
    target.protocol = "https:";
    target.hostname = "sesicthub.co.ke";
    return Response.redirect(target.toString(), 308);
  }
};

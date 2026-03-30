const { Resend } = require("resend");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_APIKEY);

function generateClaimEmailHtml(payout) {
  const claimUrl = `${process.env.FRONTEND_URL || "https://voulti.com"}/claim/${
    payout.id
  }`;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0070f3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #0070f3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #0070f3; }
    .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Your Payment is Ready!</h1>
    </div>
    <div class="content">
      <p>Hi ${payout.to_name},</p>
      
      <p>Great news! Your payment is ready to claim:</p>
      
      <p class="amount">${payout.to_amount} ${payout.to_currency}</p>
      
      <div class="details">
        <h3>Payment Details</h3>
        <p><strong>Payout ID:</strong> ${payout.id}</p>
        <p><strong>Amount:</strong> ${payout.to_amount} ${
    payout.to_currency
  }</p>
        <p><strong>From:</strong> ${
          payout.commerces?.name || "Voulti Commerce"
        }</p>
        <p><strong>Network:</strong> ${payout.to_chain_name}</p>
        <p><strong>Token:</strong> ${payout.to_token_symbol}</p>
      </div>
      
      <p>Click the button below to claim your funds:</p>
      
      <a href="${claimUrl}" class="button">
        Claim Your Payment
      </a>
      
      <p><small>You will need to verify your email address to receive the funds.</small></p>
      
      <p>If you have any questions, feel free to reply to this email.</p>
      
      <p>Best regards,<br><strong>Voulti Team</strong></p>
    </div>
  </div>
</body>
</html>
  `;
}

async function testVaultEmail() {
  try {
    console.log("🧪 Testing vault claim email...");

    const mockPayout = {
      id: "test-payout-123",
      to_name: "Camilo Sacanamboy",
      to_amount: 100,
      to_currency: "COP",
      to_chain_name: "Celo Mainnet",
      to_token_symbol: "cCOP",
      commerces: {
        name: "Test Commerce",
      },
    };

    const emailHtml = generateClaimEmailHtml(mockPayout);

    const { data, error } = await resend.emails.send({
      from: "Voulti <noreply@notifications.voulti.com>",
      to: ["csacanam@gmail.com"],
      subject: `💰 Your Payment is Ready to Claim - ${mockPayout.to_amount} ${mockPayout.to_currency}`,
      html: emailHtml,
    });

    if (error) {
      console.error("❌ Email error:", error);
    } else {
      console.log("✅ Vault claim email sent successfully:", data);
    }
  } catch (error) {
    console.error("❌ Failed to send vault email:", error);
  }
}

testVaultEmail();

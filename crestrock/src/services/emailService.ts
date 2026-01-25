import emailjs from '@emailjs/browser';

// Initialize EmailJS with your public key
emailjs.init('rj9X9k1I4_RttUcpK'); // Your public key

export interface OrderEmailData {
  customer_name: string;
  order_id: string;
  items_list: string;
  total_amount: string;
  delivery_address: string;
  phone: string;
  order_date: string;
  receipt_number: string;
  amount_paid: string;
  payment_time: string;
  order_link: string;
  current_year: string;
}

export async function sendOrderConfirmationEmail(
  toEmail: string,
  orderData: OrderEmailData
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('📧 Sending order confirmation email to:', toEmail);
    
    const templateParams = {
      to_email: toEmail,
      ...orderData,
    };

    const response = await emailjs.send(
      'service_n95t4bw', // Your service ID
      'template_yt3gu5a', // Your template ID
      templateParams
    );

    console.log('✅ Email sent successfully:', response);
    return {
      success: true,
      message: 'Order confirmation email sent successfully',
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
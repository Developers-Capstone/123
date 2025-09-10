const express = require('express');
const twilio = require('twilio');
const User = require('../models/User');
const SOSAlert = require('../models/SOSAlert');
const authenticateToken = require('./auth').authenticateToken;
const router = express.Router();

// Initialize Twilio client for SOS alerts (Account 2)
let twilioClientSOS = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID_SOS && process.env.TWILIO_AUTH_TOKEN_SOS && 
      !process.env.TWILIO_ACCOUNT_SID_SOS.startsWith('ACxxxxxxxx')) {
    twilioClientSOS = twilio(
      process.env.TWILIO_ACCOUNT_SID_SOS,
      process.env.TWILIO_AUTH_TOKEN_SOS
    );
  }
} catch (error) {
  console.log('Twilio SOS client not initialized - using demo mode');
}

// Phone number formatting function to ensure E.164 format
function formatPhoneNumber(phone) {
  console.log(`[formatPhoneNumber] Input: "${phone}"`);
  
  if (!phone) {
    console.log(`[formatPhoneNumber] Input is null/empty, returning null`);
    return null;
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  console.log(`[formatPhoneNumber] Digits extracted: "${digits}" (length: ${digits.length})`);
  
  // If already starts with +, return as is (assuming it's already formatted)
  if (phone.startsWith('+')) {
    console.log(`[formatPhoneNumber] Already has +, returning: "${phone}"`);
    return phone;
  }
  
  // Handle Indian numbers
  if (digits.length === 10) {
    // 10 digits - add +91 country code for India
    const formatted = `+91${digits}`;
    console.log(`[formatPhoneNumber] 10 digits, formatted: "${formatted}"`);
    return formatted;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // 12 digits starting with 91 - add + prefix
    const formatted = `+${digits}`;
    console.log(`[formatPhoneNumber] 12 digits starting with 91, formatted: "${formatted}"`);
    return formatted;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // 11 digits starting with 1 - likely US number
    const formatted = `+${digits}`;
    console.log(`[formatPhoneNumber] 11 digits starting with 1, formatted: "${formatted}"`);
    return formatted;
  }
  
  // For numbers longer than 10 digits, check if they need +91 prefix
  if (digits.length > 10) {
    // If it's 11+ digits and doesn't start with country code, assume it's malformed
    const formatted = `+${digits}`;
    console.warn(`[formatPhoneNumber] ${digits.length} digits, may be malformed: "${phone}" -> "${formatted}"`);
    return formatted;
  }
  
  // Return original if can't format
  console.warn(`[formatPhoneNumber] Unable to format: "${phone}"`);
  return phone;
}

// Dummy police number for demo
const POLICE_NUMBER = formatPhoneNumber('+91807643514');

// Send SOS Alert
router.post('/sos', authenticateToken, async (req, res) => {
  console.log('=== SOS ALERT ENDPOINT CALLED ===');
  console.log('Request body:', req.body);
  console.log('User ID:', req.user?.id);
  
  try {
    const { latitude, longitude, address, alertType = 'emergency' } = req.body;

    if (!latitude || !longitude) {
      console.log('Missing coordinates - returning 400');
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required'
      });
    }

    console.log('Finding user by ID:', req.user.id);
    // Get user with emergency contacts
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('User not found - returning 404');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User found:', user.name, 'Emergency contacts:', user.emergencyContacts?.length || 0);

    // Check if user is fully verified
    if (!user.isFullyVerified()) {
      console.log('User not fully verified - returning 403');
      return res.status(403).json({
        success: false,
        message: 'Only verified users can send SOS alerts'
      });
    }

    // Create Google Maps link
    const mapsLink = `https://maps.google.com/maps?q=${latitude},${longitude}`;
    
    // Create SOS alert record
    const sosAlert = new SOSAlert({
      userId: user._id,
      location: {
        latitude,
        longitude,
        address: address || 'Location not specified'
      },
      alertType
    });

    // Prepare SMS message
    const alertMessage = `SOS! I need help.\nName: ${user.name}\nPhone: ${formatPhoneNumber(user.phone)}\nLocation: ${mapsLink}`;

    const notifications = [];

    // Send to emergency contacts
    if (user.emergencyContacts && user.emergencyContacts.length > 0) {
      for (const contact of user.emergencyContacts) {
        try {
          if (!twilioClientSOS) {
            // Demo mode - simulate SMS sending
            console.log(`DEMO MODE - Would send SMS to ${contact.name} (${formatPhoneNumber(contact.phone)}): ${alertMessage}`);
            notifications.push({
              name: contact.name,
              phone: formatPhoneNumber(contact.phone),
              notificationStatus: 'sent',
              sentAt: new Date()
            });
          } else {
            console.log(`[SOS] Sending 3 SMS messages to ${contact.name} at ${formatPhoneNumber(contact.phone)}`);
            
            // Send SMS messages synchronously to avoid async issues
            let smsSent = true;
            for (let i = 1; i <= 3; i++) {
              console.log(`[SOS] Sending SMS ${i}/3 to ${contact.name} at "${formatPhoneNumber(contact.phone)}"`);
              try {
                const twilioResponse = await twilioClientSOS.messages.create({
                  body: `${alertMessage} (Alert ${i}/3)`,
                  from: process.env.TWILIO_PHONE_NUMBER_SOS,
                  to: formatPhoneNumber(contact.phone)
                });
                console.log(`[SOS] SMS ${i}/3 sent successfully to ${contact.name}: SID ${twilioResponse.sid}`);
              } catch (smsError) {
                console.error(`[SOS] Failed to send SMS ${i}/3 to ${contact.name}:`, smsError);
                console.error(`[SOS] Error details - Code: ${smsError.code}, Message: ${smsError.message}`);
                console.error(`[SOS] Phone number used: "${formatPhoneNumber(contact.phone)}"`);
                smsSent = false;
              }
              
              // Add delay between messages (except for the last one)
              if (i < 3) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }

            notifications.push({
              name: contact.name,
              phone: formatPhoneNumber(contact.phone),
              notificationStatus: smsSent ? 'sent' : 'failed',
              sentAt: new Date()
            });
          }

        } catch (error) {
          console.error(`Failed to send SMS to ${contact.name}:`, error);
          notifications.push({
            name: contact.name,
            phone: formatPhoneNumber(contact.phone),
            notificationStatus: 'failed',
            sentAt: new Date()
          });
        }
      }
    }

    // Send to police (dummy number for demo)
    try {
      const policeMessage = `SOS! I need help.\nName: ${user.name}\nPhone: ${formatPhoneNumber(user.phone)}\nLocation: ${mapsLink}`;
      
      if (!twilioClientSOS) {
        // Demo mode - simulate police notification
        console.log(`DEMO MODE - Would send police SMS to ${formatPhoneNumber(POLICE_NUMBER)}: ${policeMessage}`);
        sosAlert.policeNotified = true;
        sosAlert.policeNotificationStatus = 'sent';
      } else {
        await twilioClientSOS.messages.create({
          body: policeMessage,
          from: process.env.TWILIO_PHONE_NUMBER_SOS,
          to: formatPhoneNumber(POLICE_NUMBER)
        });

        sosAlert.policeNotified = true;
        sosAlert.policeNotificationStatus = 'sent';
        console.log('Police notification sent successfully');
      }

    } catch (policeError) {
      console.error('Failed to send police notification:', policeError);
      sosAlert.policeNotificationStatus = 'failed';
    }

    // Update SOS alert with notification results
    console.log('[SOS] Updating SOS alert with notification results...');
    sosAlert.contactsNotified = notifications;
    
    console.log('[SOS] Saving SOS alert to database...');
    await sosAlert.save();
    console.log('[SOS] SOS alert saved successfully');

    console.log('[SOS] Preparing response...');
    const response = {
      success: true,
      message: 'SOS alert sent successfully',
      alert: {
        id: sosAlert._id,
        alertType: sosAlert.alertType,
        location: sosAlert.location,
        contactsNotified: notifications.length,
        policeNotified: sosAlert.policeNotified,
        createdAt: sosAlert.createdAt
      }
    };
    
    console.log('[SOS] Sending success response:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('=== SOS ALERT ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Check if this is a Twilio error
    if (error.code && error.status) {
      console.error('This appears to be a Twilio error');
      return res.status(500).json({
        success: false,
        message: `Twilio error: ${error.message}`,
        error: {
          code: error.code,
          status: error.status,
          message: error.message
        }
      });
    }
    
    // Check if this is a database error
    if (error.name === 'MongoError' || error.name === 'ValidationError') {
      console.error('This appears to be a database error');
      return res.status(500).json({
        success: false,
        message: `Database error: ${error.message}`,
        error: {
          name: error.name,
          message: error.message
        }
      });
    }
    
    // Generic error
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add emergency contact
router.post('/contacts', authenticateToken, async (req, res) => {
  console.log('[ADD_CONTACT] Request received:', req.body);
  
  try {
    const { name, phone, relationship, priority = 1 } = req.body;
    console.log(`[ADD_CONTACT] Raw input - name: "${name}", phone: "${phone}", relationship: "${relationship}", priority: ${priority}`);

    if (!name || !phone || !relationship) {
      console.log('[ADD_CONTACT] Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and relationship are required'
      });
    }

    // Format phone number
    let formattedPhone = formatPhoneNumber(phone.trim());
    console.log(`[ADD_CONTACT] Phone after formatting: "${formattedPhone}"`);
    
    if (!formattedPhone.startsWith('+91') && formattedPhone.length === 10) {
      formattedPhone = '+91' + formattedPhone;
      console.log(`[ADD_CONTACT] Added +91 prefix: "${formattedPhone}"`);
    }

    console.log(`[ADD_CONTACT] Final phone number to save: "${formattedPhone}"`);

    // Get user and add contact
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('[ADD_CONTACT] User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`[ADD_CONTACT] Current contacts count: ${user.emergencyContacts?.length || 0}`);

    // Check if user already has 5 contacts
    if (user.emergencyContacts && user.emergencyContacts.length >= 5) {
      console.log('[ADD_CONTACT] Maximum contacts reached');
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 emergency contacts allowed'
      });
    }

    // Check if phone number already exists
    const existingContact = user.emergencyContacts?.find(contact => contact.phone === formattedPhone);
    if (existingContact) {
      console.log(`[ADD_CONTACT] Phone number already exists: "${formattedPhone}"`);
      return res.status(400).json({
        success: false,
        message: 'This phone number is already added as an emergency contact'
      });
    }

    // Add new contact
    const newContact = {
      name: name.trim(),
      phone: formattedPhone,
      relationship: relationship.trim(),
      priority: Math.min(Math.max(parseInt(priority), 1), 3) // Ensure priority is 1-3
    };

    console.log(`[ADD_CONTACT] Adding contact to database:`, newContact);

    if (!user.emergencyContacts) {
      user.emergencyContacts = [];
    }
    user.emergencyContacts.push(newContact);

    await user.save();
    console.log(`[ADD_CONTACT] Contact saved successfully. Total contacts: ${user.emergencyContacts.length}`);

    res.json({
      success: true,
      message: 'Emergency contact added successfully',
      contact: newContact
    });

  } catch (error) {
    console.error('[ADD_CONTACT] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add emergency contact'
    });
  }
});

// Get emergency contacts
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('emergencyContacts');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      contacts: user.emergencyContacts
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency contacts'
    });
  }
});

// Update emergency contact
router.put('/contacts/:contactId', authenticateToken, async (req, res) => {
  try {
    const { name, phone, relationship, priority } = req.body;
    const contactId = req.params.contactId;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const contact = user.emergencyContacts.id(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Update contact fields
    if (name) contact.name = name;
    if (phone) {
      let formattedPhone = formatPhoneNumber(phone.trim());
      if (!formattedPhone.startsWith('+91') && formattedPhone.length === 10) {
        formattedPhone = '+91' + formattedPhone;
      }
      contact.phone = formattedPhone;
    }
    if (relationship) contact.relationship = relationship;
    if (priority) contact.priority = Math.min(Math.max(priority, 1), 3);

    await user.save();

    res.json({
      success: true,
      message: 'Emergency contact updated successfully',
      contact
    });

  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency contact'
    });
  }
});

// Delete emergency contact
router.delete('/contacts/:contactId', authenticateToken, async (req, res) => {
  try {
    const contactId = req.params.contactId;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const contact = user.emergencyContacts.id(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    contact.remove();
    await user.save();

    res.json({
      success: true,
      message: 'Emergency contact deleted successfully'
    });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete emergency contact'
    });
  }
});

// Get user's SOS alerts history
router.get('/sos-history', authenticateToken, async (req, res) => {
  try {
    const alerts = await SOSAlert.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      alerts
    });

  } catch (error) {
    console.error('Get SOS history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SOS history'
    });
  }
});

module.exports = router;

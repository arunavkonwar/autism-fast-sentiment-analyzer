class Timestamp < ActiveRecord::Base
	self.abstract_class = true	# Keep looking up the chain

private

  # Properly set dfrom for new records
  # This used to have attribute_names coming in as a parameter before rails 4.2.1
  def _create_record
    # Tried to do:
    # self.dfrom = ApplicationController.helpers.current_time
    # and although this object exists here, it doesn't work for some reason
    self.dfrom = ActiveRecord::Base.connection.execute("SELECT NOW() AS now;").first["now"] if self.dfrom == nil
  	super

    # def _create_record(attribute_names = self.attribute_names)
    #   attributes_values = arel_attributes_with_values_for_create(attribute_names)

    #   new_id = self.class.unscoped.insert attributes_values

    #   # CPK
    #   # If one of the key columns is set up in a Postgres database with a SEQUENCE, then with
    #   # memoization that attribute comes back as nil instead of reporting its new integer value.
    #   #self.id ||= new_id if self.class.primary_key
    #   self.id = new_id if self.class.primary_key

    #   @new_record = false
    #   id
    # end
  end

end

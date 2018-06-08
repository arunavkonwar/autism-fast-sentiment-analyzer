class CreateUsers < ActiveRecord::Migration[5.0]
  def change
    create_table :users, id: false do |t|
      t.integer :id, index: true
      t.string :cookie

      t.string :name
      t.string :email
      t.string :sms
      t.string :password_digest
      t.boolean :is_admin, default: false
      t.string :fb_login
      t.string :twitter_login
      t.references :referred_by, index: true #, foreign_key: true

      t.datetime :dfrom, index: true
      t.datetime :dto, index: true, default: '9999-12-31'
    end
  end

  def migrate(direction)
    super # Let Rails do IDs automatically for INSERTs...
    if direction == :up # add a sequence if we're going 'up.'
      execute "CREATE SEQUENCE users_seq; ALTER TABLE users ALTER COLUMN id SET DEFAULT NEXTVAL('users_seq');"
    elsif direction == :down
      execute 'DROP SEQUENCE IF EXISTS users_seq;'
    end
  end
end

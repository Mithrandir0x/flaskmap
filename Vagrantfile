# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "precise64"
  config.vm.box_url = "http://files.vagrantup.com/precise64.box"
  config.vm.network :public_network, :mac => '0800276C2F9D'
  config.vm.provision :shell, :path => './scripts/bootstrap.sh'
  # config.vm.synced_folder "../data", "/vagrant_data"
  # config.vm.network :forwarded_port, guest: 7070, host: 7070
  # config.vm.network :private_network, ip: "192.168.33.10"

  # config.vm.provider :virtualbox do |vb|
  #   # Don't boot with headless mode
  #   vb.gui = true
  #
  #   # Use VBoxManage to customize the VM. For example to change memory:
  #   vb.customize ["modifyvm", :id, "--memory", "1024"]
  # end

end
